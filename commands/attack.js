const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('attack')
    .setDescription('Attack another player')
    .addUserOption(option =>
      option.setName('target')
        .setDescription('Who you want to attack')
        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('move')
        .setDescription('Attack name (punch, kick, heat vision...)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const attackerId = interaction.user.id;
    const target = interaction.options.getUser('target');
    const moveName = interaction.options.getString('move').toLowerCase();
    const defenderId = target.id;
    const guildId = interaction.guild.id;

    if (attackerId === defenderId) {
      return interaction.reply({ content: 'You cannot attack yourself.', ephemeral: true });
    }

    const attackerResult = await db.query(
      `SELECT * FROM players WHERE discord_id = $1 AND guild_id = $2`,
      [attackerId, guildId]
    );
    if (attackerResult.rows.length === 0) {
      return interaction.reply({ content: 'You do not have a character yet.', ephemeral: true });
    }
    const attacker = attackerResult.rows[0];

    const defenderResult = await db.query(
      `SELECT * FROM players WHERE discord_id = $1 AND guild_id = $2`,
      [defenderId, guildId]
    );
    if (defenderResult.rows.length === 0) {
      return interaction.reply({ content: 'The target does not have a character yet.', ephemeral: true });
    }
    const defender = defenderResult.rows[0];

    const [p1, p2] = attackerId < defenderId ? [attackerId, defenderId] : [defenderId, attackerId];
    let fightResult = await db.query(
      `SELECT fights FROM fight_counts WHERE guild_id = $1 AND player1_id = $2 AND player2_id = $3`,
      [guildId, p1, p2]
    );

    let currentFights = 0;
    if (fightResult.rows.length === 0) {
      await db.query(
        `INSERT INTO fight_counts (guild_id, player1_id, player2_id, fights) VALUES ($1, $2, $3, 0)`,
        [guildId, p1, p2]
      );
    } else {
      currentFights = fightResult.rows[0].fights;
    }

    if (currentFights >= 3) {
      return interaction.reply({ content: 'You already fought 3 times against this player. No more fights allowed.', ephemeral: true });
    }

    const isDeathMatch = currentFights === 2; 

    let move = null;
    let isBasic = false;
    let powerId = null;

    const basicResult = await db.query(
  `SELECT * FROM basic_attacks WHERE LOWER(name) = $1`,
  [moveName]
);

if (basicResult.rows.length > 0) {
  const basicMove = basicResult.rows[0];

  if (basicMove.allowed_race) {
    const raceCheck = await db.query(
      `SELECT r.name FROM players p
       JOIN races r ON r.id = p.race_id
       WHERE p.discord_id = $1 AND p.guild_id = $2`,
      [attackerId, guildId]
    );

    if (raceCheck.rows.length === 0 || raceCheck.rows[0].name !== basicMove.allowed_race) {
      return interaction.reply({
        content: `Only **${basicMove.allowed_race}** can use ** ${basicMove.name}**.`,
        ephemeral: true
      });
    }
  }

  move = basicMove;
  isBasic = true;
}
    else {

      const powerResult = await db.query(
        `SELECT p.*, pp.level
         FROM powers p
         JOIN player_powers pp ON pp.power_id = p.id AND pp.discord_id = $1 AND pp.guild_id = $2
         WHERE LOWER(p.name) = $3 AND p.is_passive = FALSE`,
        [attackerId, guildId, moveName]
      );

      if (powerResult.rows.length === 0) {
        return interaction.reply({ content: `You do not have the move **${moveName}** or it is not an usable attack.`, ephemeral: true });
      }
      move = powerResult.rows[0];
      powerId = move.id;
    }

    if (attacker.energy < move.energy_cost) {
      return interaction.reply({ content: 'Not enough energy!', ephemeral: true });
    }

    let damage = move.base_damage;

    if (!isBasic) {
      damage += (move.level || 1) * 5;
    }

    damage += Math.floor(attacker.strength * 0.4);
    damage += Math.floor(attacker.combat * 0.2);

    const passiveBonus = await db.query(
      `SELECT p.name FROM player_powers pp
       JOIN powers p ON p.id = pp.power_id
       WHERE pp.discord_id = $1 AND pp.guild_id = $2 AND p.is_passive = TRUE`,
      [attackerId, guildId]
    );

    for (const passive of passiveBonus.rows) {
      if (passive.name === 'Super Strength' || passive.name === 'Godly Strength') {
        damage += 12;
      }
      if (passive.name === 'Martial Arts Mastery' || passive.name === 'Amazonian Combat') {
        damage += 8;
      }
    }

    damage = Math.max(1, Math.floor(damage - (defender.defense * 0.3)));

    let hitType = 'normal';
    const levelDiff = defender.level - attacker.level;
    let dodgeChance = 10;

    if (levelDiff >= 0) dodgeChance += 15 + (levelDiff * 5);
    if (dodgeChance > 45) dodgeChance = 45;

    const roll = Math.random() * 100;

    if (roll < dodgeChance) {
      hitType = 'dodge';
      damage = 0;
    } else if (roll < dodgeChance + 20) {
      hitType = 'glancing';
      damage = Math.floor(damage / 2);
    }

    const newHp = Math.max(0, defender.hp - damage);
    const isKill = newHp === 0;

    await db.query(`UPDATE players SET energy = energy - $1 WHERE discord_id = $2 AND guild_id = $3`, [move.energy_cost, attackerId, guildId]);
    await db.query(`UPDATE players SET hp = $1 WHERE discord_id = $2 AND guild_id = $3`, [newHp, defenderId, guildId]);

    if (!isBasic && powerId) {
      await db.query(
        `UPDATE player_powers SET xp = xp + 20, uses = uses + 1, last_used_at = NOW()
         WHERE discord_id = $1 AND guild_id = $2 AND power_id = $3`,
        [attackerId, guildId, powerId]
      );
    }

    await db.query(
      `UPDATE fight_counts SET fights = fights + 1 WHERE guild_id = $1 AND player1_id = $2 AND player2_id = $3`,
      [guildId, p1, p2]
    );

    await db.query(
      `INSERT INTO battles (attacker_id, defender_id, power_id, damage_dealt, defender_hp_before, defender_hp_after, result, is_kill)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [attackerId, defenderId, powerId, damage, defender.hp, newHp, isKill ? 'defeated' : hitType, isKill]
    );

    let message = `**${interaction.user.username}** used ** ${move.name}** on **${target.username}**!\n`;

    if (hitType === 'dodge') {
      message += `**${target.username}** dodged the attack!`;
    } else if (hitType === 'glancing') {
      message += `Glancing blow! Damage: **${damage}** (half)\nRemaining HP: ** ${newHp}/${defender.max_hp}**`;
    } else {
      message += `Damage dealt: **${damage}**\nRemaining HP: ** ${newHp}/${defender.max_hp}**`;
    }

    if (isDeathMatch) {
      message += `\n\n**DEATH MATCH!**`;
    }

    if (isKill) {
      message += `\n\n**${target.username}** has been defeated!`;

      if (isDeathMatch) {
        await db.query(
          `UPDATE players SET
            hp = max_hp,
            energy = max_energy,
            level = 1,
            xp = 0,
            xp_to_next_level = 100,
            points = 0,
            death_count = death_count + 1,
            defeat_count = defeat_count + 1
           WHERE discord_id = $1 AND guild_id = $2`,
          [defenderId, guildId]
        );
        await db.query(`DELETE FROM player_powers WHERE discord_id = $1 AND guild_id = $2`, [defenderId, guildId]);
        await db.query(`DELETE FROM player_items WHERE discord_id = $1 AND guild_id = $2`, [defenderId, guildId]);
        message += `\n**${target.username}** died and lost all progress!`;
      } else {
        await db.query(
          `UPDATE players SET defeat_count = defeat_count + 1 WHERE discord_id = $1 AND guild_id = $2`,
          [defenderId, guildId]
        );
      }

      await db.query(
        `UPDATE players SET victory_count = victory_count + 1, xp = xp + 40 WHERE discord_id = $1 AND guild_id = $2`,
        [attackerId, guildId]
      );
    }

    await interaction.reply({ content: message });
  }
};
