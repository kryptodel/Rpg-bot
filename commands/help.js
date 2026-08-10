const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Shows how the bot works and all available commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('DC Comics RPG Bot - Help')
      .setColor(0xE74C3C)
      .setDescription('Welcome to the DC Comics RPG system!')
      .addFields(
        {
          name: 'Getting Started',
          value: '1. Use `/characters` to see available characters\n2. Use `/character choose name:Superman` to select one\n3. Start fighting, training and buying items!'
        },
        {
          name: 'Commands',
          value: 
            '`/characters` - List all available characters\n' +
            '`/character choose` - Choose your character\n' +
            '`/character info` - View your current character\n' +
            '`/stats` - View your full stats\n' +
            '`/abilities` - View your powers and passive bonuses\n' +
            '`/attack` - Attack another player\n' +
            '`/power` - Use a special power\n' +
            '`/train` - Train to gain XP\n' +
            '`/shop` - View the item shop\n' +
            '`/buy` - Buy an item from the shop\n' +
            '`/inventory` - View your items\n' +
            '`/help` - Show this message'
        },
        {
          name: 'Combat System',
          value: 
            '• Everyone can use basic attacks: `punch`, `kick`, `elbow`, `knee`, `headbutt`, `uppercut`, `sweep`, `slam`\n' +
            '• Special powers like Heat Vision can also be used as attacks\n' +
            '• Passive powers (Super Strength, etc.) only give damage bonuses\n' +
            '• Attacks can be dodged or land as glancing blows (half damage)\n' +
            '• You can fight the same player only 3 times\n' +
            '• The 3rd fight is a **Death Match** (loser resets progress)'
        },
        {
          name: 'Points & Shop',
          value: 
            '• You earn **1 point** every time you send a message in the server\n' +
            '• Use points to buy items in `/shop`\n' +
            '• Items include equipment, consumables and special weapons like Kryptonite'
        },
        {
          name: 'Progression',
          value: 
            '• Using powers and winning fights gives XP\n' +
            '• `/train` also gives XP\n' +
            '• Switching characters **resets all progress** on this server\n' +
            '• Progress is separated by server'
        },
        {
          name: 'Important Rules',
          value: 
            '• You can only have one character per server\n' +
            '• Changing character wipes powers, items, points and levels\n' +
            '• Death in a Death Match causes full reset'
        }
      )
      .setFooter({ text: 'New updates are coming soon...' });

    await interaction.reply({ embeds: [embed] });
  }
};
