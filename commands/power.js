const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('power')
    .setDescription('Use a special power')
    .addStringOption(option =>
      option.setName('name')
        .setDescription('Power name (ex: Heat Vision)')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guild.id;
    const powerName = interaction.options.getString('name');

    const result = await db.query(
      `SELECT p.id, p.name, p.base_damage, p.energy_cost, p.description, p.is_passive,
              pp.level, pl.energy
       FROM powers p
       JOIN player_powers pp ON pp.power_id = p.id AND pp.discord_id = $1 AND pp.guild_id = $2
       JOIN players pl ON pl.discord_id = $1 AND pl.guild_id = $2
       WHERE LOWER(p.name) = LOWER($3)`,
      [discordId, guildId, powerName]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: `You do not have the power **${powerName}**.`,
        ephemeral: true
      });
    }

    const power = result.rows[0];

    if (power.is_passive) {
      return interaction.reply({
        content: `**${power.name}** is a passive bonus and cannot be used as an attack.`,
        ephemeral: true
      });
    }

    if (power.energy < power.energy_cost) {
      return interaction.reply({
        content: `Not enough energy! You have ${power.energy} and need ${power.energy_cost}.`,
        ephemeral: true
      });
    }

    await db.query(
      `UPDATE players SET energy = energy - $1 WHERE discord_id = $2 AND guild_id = $3`,
      [power.energy_cost, discordId, guildId]
    );

    await db.query(
      `UPDATE player_powers 
       SET xp = xp + 15, uses = uses + 1, last_used_at = NOW()
       WHERE discord_id = $1 AND guild_id = $2 AND power_id = $3`,
      [discordId, guildId, power.id]
    );

    await interaction.reply({
      content: `You used **${power.name}** (Level ${power.level})!\nBase damage: ** ${power.base_damage}** | Energy spent: **${power.energy_cost}**`
    });
  }
};
