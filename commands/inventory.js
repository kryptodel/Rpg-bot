const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('Shows your items'),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guild.id;

    const result = await db.query(
      `SELECT i.name, i.description, i.item_type, i.effect_type, i.effect_value,
              pi.uses_left, pi.is_equipped
       FROM player_items pi
       JOIN items i ON i.id = pi.item_id
       WHERE pi.discord_id = $1 AND pi.guild_id = $2
       ORDER BY i.item_type, i.name`,
      [discordId, guildId]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'Your inventory is empty.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`Inventory of ${interaction.user.username}`)
      .setColor(0x1ABC9C);

    for (const item of result.rows) {
      let value = item.description || 'No description';
      if (item.uses_left !== null) value += `\nUses left: ${item.uses_left}`;
      if (item.is_equipped) value += `\n**Equipped**`;

      embed.addFields({
        name: `${item.name} ( ${item.item_type})`,
        value: value
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
