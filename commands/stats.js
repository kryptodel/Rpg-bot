const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stats')
    .setDescription('Shows your RPG stats'),

  async execute(interaction) {
    const discordId = interaction.user.id;

    const result = await db.query(
      `SELECT p.*, c.name as character_name, r.name as race_name
       FROM players p
       LEFT JOIN characters c ON c.id = p.character_id
       LEFT JOIN races r ON r.id = p.race_id
       WHERE p.discord_id = $1`,
      [discordId]
    );

    if (result.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have a character yet. Use `/character choose` first.',
        ephemeral: true
      });
    }

    const player = result.rows[0];

    const embed = new EmbedBuilder()
      .setTitle(`Stats of ${interaction.user.username}`)
      .setColor(0x00FF99)
      .setDescription(`**${player.character_name || 'None'}** | ${player.race_name || 'None'}`)
      .addFields(
        { name: 'Level', value: `${player.level}`, inline: true },
        { name: 'XP', value: `${player.xp} / ${player.xp_to_next_level}`, inline: true },
        { name: 'HP', value: `${player.hp} / ${player.max_hp}`, inline: true },
        { name: 'Energy', value: `${player.energy} / ${player.max_energy}`, inline: true },
        { name: 'Strength', value: `${player.strength}`, inline: true },
        { name: 'Speed', value: `${player.speed}`, inline: true },
        { name: 'Defense', value: `${player.defense}`, inline: true },
        { name: 'Intelligence', value: `${player.intelligence}`, inline: true },
        { name: 'Combat', value: `${player.combat}`, inline: true },
        { name: 'Victories', value: `${player.victory_count}`, inline: true },
        { name: 'Defeats', value: `${player.defeat_count}`, inline: true },
        { name: 'Deaths', value: `${player.death_count}`, inline: true }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
