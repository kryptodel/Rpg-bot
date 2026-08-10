const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('characters')
    .setDescription('Shows all available characters you can choose'),

  async execute(interaction) {
    const result = await db.query(
      `SELECT c.name as character_name, r.name as race_name, c.description
       FROM characters c
       LEFT JOIN races r ON r.id = c.race_id
       ORDER BY c.name`
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'No characters available.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Available Characters')
      .setColor(0x3498DB)
      .setDescription('Use `/character choose name:CharacterName` to select one.\n**Warning:** Switching characters resets all your progress on this server.');

    for (const char of result.rows) {
      embed.addFields({
        name: `${char.character_name} ( ${char.race_name})`,
        value: char.description || 'No description'
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
