import { Client, GatewayIntentBits, Partials, TextChannel, EmbedBuilder, ButtonBuilder, ActionRowBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, GuildMemberRoleManager } from 'discord.js';
import { storage } from './storage';

// Configuration from prompt
const BOT_TOKEN = "MTQ2OTgwODI3NDc4MTExNDM4OQ.GAcQom.wL8EG7r_CTrJCjXBZr_481BpVeGVhwiHaDXh4A";
const ALLOWED_ROLE_ID = "1467499741238788192";
const PREFIX = ",linkvertise";

// State to remember the role to grant (set via command)
let targetRoleId: string | null = null;
let verifyUrl: string | null = null;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // REQUIRED for commands
    GatewayIntentBits.GuildMembers   // REQUIRED for role management
  ],
  partials: [Partials.Channel]
});

export function startBot() {
  client.login(BOT_TOKEN).catch(err => {
    console.error("Failed to login to Discord:", err);
  });
}

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}!`);
});

// Command Handling
client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  
  // LOGGING FOR DEBUGGING
  console.log(`[Bot] Received message: "${message.content}" from ${message.author.tag}`);

  if (!message.content.startsWith(PREFIX)) return;

  // Check permission
  if (!message.member?.roles.cache.has(ALLOWED_ROLE_ID)) {
    console.log(`[Bot] Unauthorized attempt by ${message.author.tag}`);
    return;
  }

  // Parse command: ,linkvertise #channel @role <link>
  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  console.log(`[Bot] Parsing args:`, args);
  
  // Need at least 3 args: channel, role, link
  if (args.length < 3) {
    message.reply("Usage: `,linkvertise #channel @role <link>`");
    return;
  }

  const channelId = args[0].replace(/[<#>]/g, '');
  const roleId = args[1].replace(/[<@&>]/g, '');
  const link = args[2];

  console.log(`[Bot] Target Channel ID: ${channelId}, Role ID: ${roleId}, Link: ${link}`);

  // Store for later verification
  targetRoleId = roleId;
  verifyUrl = link;

  try {
    const channel = await client.channels.fetch(channelId);
    if (!channel || !(channel instanceof TextChannel)) {
      console.log(`[Bot] Channel not found or not a text channel: ${channelId}`);
      message.reply("Invalid channel.");
      return;
    }

    // Send Embed
    const embed = new EmbedBuilder()
      .setTitle("Unlock Your Free Role")
      .setDescription("Unlock the role mentioned by completing verification below.\n\n✔ fast\n✔ secure\n✔ automatic\n\n**How it works**\n1. Click **Get Code**\n2. Finish the guide\n3. Visit the verification page\n4. Copy your personal code\n5. Submit it to unlock access")
      .setColor(0x00FF00); // Greenish

    const getCodeBtn = new ButtonBuilder()
      .setLabel("Get Code")
      .setStyle(ButtonStyle.Link)
      .setURL(link);

    const submitBtn = new ButtonBuilder()
      .setCustomId("submit_code_btn")
      .setLabel("Submit Code")
      .setStyle(ButtonStyle.Success);

    const row = new ActionRowBuilder<ButtonBuilder>()
      .addComponents(getCodeBtn, submitBtn);

    await channel.send({ embeds: [embed], components: [row] });
    message.reply(`✅ Panel sent to <#${channelId}>! Users will receive role <@&${roleId}>.`);
    console.log(`[Bot] Panel successfully sent to channel ${channelId}`);
  } catch (error) {
    console.error("[Bot] Error sending panel:", error);
    message.reply("Failed to send panel. Ensure the bot has permissions in that channel.");
  }
});

// Interaction Handling
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton() && !interaction.isModalSubmit()) return;

  // Handle "Submit Code" Button -> Open Modal
  if (interaction.isButton() && interaction.customId === 'submit_code_btn') {
    const modal = new ModalBuilder()
      .setCustomId('verify_modal')
      .setTitle('Verification');

    const codeInput = new TextInputBuilder()
      .setCustomId('code_input')
      .setLabel("Enter your 11-character code")
      .setPlaceholder("XXX-XXX-XXX")
      .setStyle(TextInputStyle.Short)
      .setMinLength(11)
      .setMaxLength(11)
      .setRequired(true);

    const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(codeInput);
    modal.addComponents(firstActionRow);

    await interaction.showModal(modal);
  }

  // Handle Modal Submission
  if (interaction.isModalSubmit() && interaction.customId === 'verify_modal') {
    const code = interaction.fields.getTextInputValue('code_input');
    const member = interaction.member; // GuildMember
    
    if (!member || !('roles' in member)) {
      await interaction.reply({ content: 'Could not verify user.', ephemeral: true });
      return;
    }

    // Verify Code
    const result = storage.verifyCode(code, interaction.user.id);

    if (result.valid) {
      // Grant Role
      if (targetRoleId && member.roles instanceof GuildMemberRoleManager) {
        try {
          await member.roles.add(targetRoleId);
          
          // Schedule removal after 3 hours
          setTimeout(async () => {
            try {
              if (member.roles instanceof GuildMemberRoleManager) {
                await member.roles.remove(targetRoleId!);
              }
            } catch (e) {
              console.error("Failed to remove role:", e);
            }
          }, 3 * 60 * 60 * 1000);

          // DM User
          const dmEmbed = new EmbedBuilder()
            .setTitle("Verification Successful")
            .setDescription(`You have been granted access for 3 hours.\nExpires at: <t:${Math.floor((Date.now() + 3 * 60 * 60 * 1000) / 1000)}:R>`)
            .setColor(0x00FF00);
          
          await interaction.user.send({ embeds: [dmEmbed] }).catch(() => {}); // Ignore DM failures

          await interaction.reply({ content: '✅ Verification successful! Check your DMs.', ephemeral: true });
          console.log(`[Verify] User ${interaction.user.tag} verified with code ${code}`);
        } catch (error) {
          console.error("Role assignment failed:", error);
          await interaction.reply({ content: '❌ Verification succeeded but role assignment failed. Contact staff.', ephemeral: true });
        }
      } else {
         await interaction.reply({ content: '✅ Code valid, but no role is configured by staff yet.', ephemeral: true });
      }
    } else {
      await interaction.reply({ content: `❌ Verification failed: ${result.reason}`, ephemeral: true });
      console.log(`[Verify] User ${interaction.user.tag} failed: ${result.reason}`);
    }
  }
});
