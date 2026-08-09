const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('power')
    .setDescription('Use a power / ability')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Power name (ex: Heat Vision)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const powerName = interaction.options.getString('name');

    const result = await db.query(
      `SELECT p.id, p.name, p.base_damage, p.energy_cost, p.description,
              pp.level, pp.xp, pl.energy, pl.hp
       FROM powers p
       JOIN player_powers pp ON pp.power_id = p.id AND pp.discord_id = $1
       JOIN players pl ON pl.discord_id = $1
       WHERE LOWER(p.name) = LOWER($2)`,
      [discordId, powerName]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: `You do not have the power **${powerName}** or it does not exist.`,
        ephemeral: true
      });
    }

    const power = result.rows[0];

    if (power.energy < power.energy_cost) {
      return interaction.reply({
        content: `Not enough energy! You have ${power.energy} and need ${power.energy_cost}.`,
        ephemeral: true
      });
    }

    await db.query(
      `UPDATE players SET energy = energy - $1 WHERE discord_id = $2`,
      [power.energy_cost, discordId]
    );

    await db.query(
      `UPDATE player_powers 
       SET xp = xp + 15, uses = uses + 1, last_used_at = NOW()
       WHERE discord_id = $1 AND power_id = $2`,
      [discordId, power.id]
    );

    await interaction.reply({
      content: `You used **${power.name}** (Level ${power.level})!\nBase damage: ** ${power.base_damage}** | Energy spent: **${power.energy_cost}**`
    });
  }
};
