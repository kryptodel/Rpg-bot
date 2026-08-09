const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attack')
    .setDescription('Attack another player using a power')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Who you want to attack')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('power')
        .setDescription('Power name (ex: Heat Vision)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attackerId = interaction.user.id;
    const target = interaction.options.getUser('target');
    const powerName = interaction.options.getString('power');
    const defenderId = target.id;

    if (attackerId === defenderId) {
      return interaction.reply({
        content: 'You cannot attack yourself.',
        ephemeral: true
      });
    }

    const powerResult = await db.query(
      `SELECT p.id, p.name, p.base_damage, p.energy_cost, pp.level, pl.energy, pl.strength
       FROM powers p
       JOIN player_powers pp ON pp.power_id = p.id AND pp.discord_id = $1
       JOIN players pl ON pl.discord_id = $1
       WHERE LOWER(p.name) = LOWER($2)`,
      [attackerId, powerName]
    );

    if (powerResult.rows.length === 0) {
      return interaction.reply({
        content: `You do not have the power **${powerName}**.`,
        ephemeral: true
      });
    }

    const power = powerResult.rows[0];

    if (power.energy < power.energy_cost) {
      return interaction.reply({
        content: 'Not enough energy!',
        ephemeral: true
      });
    }

    const defenderResult = await db.query(
      `SELECT hp, max_hp, defense FROM players WHERE discord_id = $1`,
      [defenderId]
    );

    if (defenderResult.rows.length === 0) {
      return interaction.reply({
        content: 'The target does not have a character in the RPG yet.',
        ephemeral: true
      });
    }

    const defender = defenderResult.rows[0];

    const damage = Math.max(1, Math.floor(
      power.base_damage + (power.level * 5) + (power.strength * 0.4) - (defender.defense * 0.3)
    ));

    const newHp = Math.max(0, defender.hp - damage);
    const isKill = newHp === 0;

    await db.query(`UPDATE players SET energy = energy - $1 WHERE discord_id = $2`, [power.energy_cost, attackerId]);
    await db.query(`UPDATE players SET hp = $1 WHERE discord_id = $2`, [newHp, defenderId]);

    await db.query(
      `UPDATE player_powers SET xp = xp + 20, uses = uses + 1, last_used_at = NOW()
       WHERE discord_id = $1 AND power_id = $2`,
      [attackerId, power.id]
    );

    await db.query(
      `INSERT INTO battles (attacker_id, defender_id, power_id, damage_dealt, defender_hp_before, defender_hp_after, result, is_kill)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [attackerId, defenderId, power.id, damage, defender.hp, newHp, isKill ? 'defeated' : 'hit', isKill]
    );

    let message = `**${interaction.user.username}** used ** ${power.name}** on **${target.username}**!\nDamage dealt: ** ${damage}**\nRemaining HP: **${newHp}/ ${defender.max_hp}**`;

    if (isKill) {
      message += `\n\n**${target.username}** has been defeated!`;
    }

    await interaction.reply({ content: message });
  }
};
