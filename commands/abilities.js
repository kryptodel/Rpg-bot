const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abilities')
    .setDescription('Shows your abilities / powers'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const playerCheck = await db.query(
      `SELECT character_id, race_id FROM players WHERE discord_id = $1`,
      [discordId]
    );

    if (playerCheck.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have a character yet. Use `/character choose` first.',
        ephemeral: true
      });
    }

    const result = await db.query(
      `SELECT p.name, p.description, p.base_damage, p.energy_cost,
              pp.level, pp.xp, pp.xp_to_next_level, pp.uses
       FROM player_powers pp
       JOIN powers p ON p.id = pp.power_id
       WHERE pp.discord_id = $1
       ORDER BY pp.level DESC, p.name`,
      [discordId]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have any unlocked powers yet.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Abilities of ${interaction.user.username}`)
      .setColor(0x9B59B6);

    for (const power of result.rows) {
      embed.addFields({
        name: `${power.name} (Lv. ${power.level})`,
        value: `XP: \( {power.xp}/ \){power.xp_to_next_level} | Damage: ${power.base_damage} | Energy: \( {power.energy_cost}\n \){power.description || 'No description'}`
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
