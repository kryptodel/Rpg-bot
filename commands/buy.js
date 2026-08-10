const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Name of the item')
        .setRequired(true)
    ),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guild.id;
    const itemName = interaction.options.getString('item');

    const playerResult = await db.query(
      `SELECT points FROM players WHERE discord_id = $1 AND guild_id = $2`,
      [discordId, guildId]
    );

    if (playerResult.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have a character yet. Use `/character choose` first.',
        ephemeral: true
      });
    }

    const player = playerResult.rows[0];

    const itemResult = await db.query(
      `SELECT * FROM items WHERE LOWER(name) = LOWER($1)`,
      [itemName]
    );

    if (itemResult.rows.length === 0) {
      return interaction.reply({
        content: `Item **${itemName}** not found.`,
        ephemeral: true
      });
    }

    const item = itemResult.rows[0];

    if (player.points < item.price) {
      return interaction.reply({
        content: `Not enough points! You have **${player.points}** and need ** ${item.price}**.`,
        ephemeral: true
      });
    }

    const owned = await db.query(
      `SELECT id FROM player_items WHERE discord_id = $1 AND guild_id = $2 AND item_id = $3`,
      [discordId, guildId, item.id]
    );

    if (owned.rows.length > 0 && item.item_type === 'equipment') {
      return interaction.reply({
        content: `You already own **${item.name}**.`,
        ephemeral: true
      });
    }

    await db.query(
      `UPDATE players SET points = points - $1 WHERE discord_id = $2 AND guild_id = $3`,
      [item.price, discordId, guildId]
    );

    await db.query(
      `INSERT INTO player_items (discord_id, guild_id, item_id, uses_left)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (discord_id, guild_id, item_id)
       DO UPDATE SET uses_left = COALESCE(player_items.uses_left, 0) + EXCLUDED.uses_left`,
      [discordId, guildId, item.id, item.max_uses]
    );

    await interaction.reply({
      content: `You bought **${item.name}** for ** ${item.price}** points!`
    });
  }
};
