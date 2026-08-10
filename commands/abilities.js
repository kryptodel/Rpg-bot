const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const db = require('../db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('abilities')
    .setDescription('Shows your abilities and passive bonuses'),

  async execute(interaction) {
    const discordId = interaction.user.id;
    const guildId = interaction.guild.id;

    const playerCheck = await db.query(
      `SELECT character_id FROM players WHERE discord_id = $1 AND guild_id = $2`,
      [discordId, guildId]
    );

    if (playerCheck.rows.length === 0) {
      return interaction.reply({
        content: 'You do not have a character yet. Use `/character choose` first.',
        ephemeral: true
      });
    }

    const result = await db.query(
      `SELECT p.name, p.description, p.base_damage, p.energy_cost, p.is_passive,
              pp.level, pp.xp, pp.xp_to_next_level, pp.uses
       FROM player_powers pp
       JOIN powers p ON p.id = pp.power_id
       WHERE pp.discord_id = $1 AND pp.guild_id = $2
       ORDER BY p.is_passive, pp.level DESC, p.name`,
      [discordId, guildId]
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

    const actives = result.rows.filter(p => !p.is_passive);
    const passives = result.rows.filter(p => p.is_passive);

    if (actives.length > 0) {
      embed.addFields({ name: 'Active Attacks', value: '────────────────' });
      for (const power of actives) {
        embed.addFields({
          name: `${power.name} (Lv. ${power.level})`,
          value: `XP: ${power.xp}/ ${power.xp_to_next_level} | Damage: ${power.base_damage} | Energy: ${power.energy_cost}\n ${power.description || 'No description'}`
        });
      }
    }

    if (passives.length > 0) {
      embed.addFields({ name: 'Passive Bonuses', value: '────────────────' });
      for (const power of passives) {
        embed.addFields({
          name: `${power.name}`,
          value: `${power.description || 'Gives combat bonuses'}`
        });
      }
    }

    await interaction.reply({ embeds: [embed] });
  }
};
