const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('train')
    .setDescription('Train to gain character XP'),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guild.id;

    const result = await db.query(
      `SELECT level, xp, xp_to_next_level FROM players WHERE discord_id = $1 AND guild_id = $2`,
      [discordId, guildId]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have a character yet. Use `/character choose` first.',
        ephemeral: true
      });
    }

    const player = result.rows[0];
    const xpGained = 15;

    let newXp = player.xp + xpGained;
    let newLevel = player.level;
    let xpToNext = player.xp_to_next_level;
    let leveledUp = false;

    if (newXp >= xpToNext) {
      newLevel += 1;
      newXp = newXp - xpToNext;
      xpToNext = Math.floor(xpToNext * 1.6);
      leveledUp = true;
    }

    await db.query(
      `UPDATE players SET xp = $1, level = $2, xp_to_next_level = $3, max_level_reached = GREATEST(max_level_reached, $2)
       WHERE discord_id = $4 AND guild_id = $5`,
      [newXp, newLevel, xpToNext, discordId, guildId]
    );

    if (leveledUp) {
      await interaction.reply(`You trained and gained **${xpGained} XP**!\nYou reached **level ${newLevel}**!`);
    } else {
      await interaction.reply(`You trained and gained **${xpGained} XP**!\nCurrent XP: ** ${newXp}/${xpToNext}**`);
    }
  }
};
