const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('character')
    .setDescription('Choose or view your character')
    .addSubcommand(subcommand =>
      subcommand
        .setName('choose')
        .setDescription('Choose a DC character')
        .addStringOption(option =>
          option.setName('name')
            .setDescription('Character name (ex: Superman)')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('View your current character')
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const discordId = interaction.user.id;

    if (subcommand === 'info') {
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
          content: 'You do not have a character yet. Use `/character choose name:`',
          ephemeral: true
        });
      }

      const player = result.rows[0];

      const embed = new EmbedBuilder()
        .setTitle(`${player.character_name || 'No character'} — ${player.race_name || 'No race'}`)
        .setColor(0x0099FF)
        .addFields(
          { name: 'Level', value: `${player.level}`, inline: true },
          { name: 'XP', value: `\( {player.xp}/ \){player.xp_to_next_level}`, inline: true },
          { name: 'HP', value: `\( {player.hp}/ \){player.max_hp}`, inline: true },
          { name: 'Energy', value: `\( {player.energy}/ \){player.max_energy}`, inline: true },
          { name: 'Strength', value: `${player.strength}`, inline: true },
          { name: 'Speed', value: `${player.speed}`, inline: true },
          { name: 'Defense', value: `${player.defense}`, inline: true },
          { name: 'Intelligence', value: `${player.intelligence}`, inline: true },
          { name: 'Combat', value: `${player.combat}`, inline: true }
        );

      return interaction.reply({ embeds: [embed] });
    }

    if (subcommand === 'choose') {
      const name = interaction.options.getString('name');

      const charResult = await db.query(
        `SELECT id, name, race_id FROM characters WHERE LOWER(name) = LOWER($1)`,
        [name]
      );

      if (charResult.rows.length === 0) {
        return interaction.reply({
          content: `Character **${name}** not found.`,
          ephemeral: true
        });
      }

      const character = charResult.rows[0];

      await db.query(
        `INSERT INTO players (discord_id, username, character_id, race_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (discord_id) 
         DO UPDATE SET 
           character_id = $3,
           race_id = $4,
           username = $2,
           updated_at = NOW()`,
        [discordId, interaction.user.username, character.id, character.race_id]
      );

      const raceResult = await db.query(
        `SELECT name FROM races WHERE id = $1`,
        [character.race_id]
      );

      return interaction.reply({
        content: `You chose **\( {character.name}** ( \){raceResult.rows[0].name})!`
      });
    }
  }
};
