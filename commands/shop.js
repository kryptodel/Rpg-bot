const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Shows the items available in the shop'),

  async execute(interaction) {
    const result = await db.query(
      `SELECT name, description, price, item_type, effect_type, effect_value, max_uses, target_race
       FROM items
       ORDER BY price`
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'The shop is empty.',
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('Item Shop')
      .setColor(0xF1C40F)
      .setDescription('Use `/buy item:ItemName` to purchase.\nYou earn points by sending messages in the server.');

    for (const item of result.rows) {
      let extra = `Price: **${item.price}** points`;
      if (item.max_uses) extra += ` | Uses: ${item.max_uses}`;
      if (item.target_race) extra += ` | Strong against: ${item.target_race}`;

      embed.addFields({
        name: `${item.name} ( ${item.item_type})`,
        value: `${item.description}\n ${extra}`
      });
    }

    await interaction.reply({ embeds: [embed] });
  }
};
