// bot.js — joins a specific guild/voice channel and plays a looping audio file to test recorder plugin

const fs = require('node:fs');
const path = require('node:path');
const {
  Client,
  GatewayIntentBits,
  Events,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
  StreamType,
} = require('@discordjs/voice');

require('dotenv').config();

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID;
const AUDIO_FILE = process.env.AUDIO_FILE || path.join(__dirname, 'test-audio.mp3'); // TODO test if needed
const LOOP = process.env.LOOP 

if (!TOKEN || !GUILD_ID || !CHANNEL_ID) {
  console.error('Missing DISCORD_TOKEN, GUILD_ID, or CHANNEL_ID. Copy .env.example to .env and fill it in.');
  process.exit(1);
}
// for guild, channel and role objects + who is in which voice channel who joined or left
const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
// Play when no connection
const player = createAudioPlayer({
  behaviors: { noSubscriber: NoSubscriberBehavior.Play },
});

function playFile() {
  if (!fs.existsSync(AUDIO_FILE)) {
    console.error(`Audio file not found: ${AUDIO_FILE}`);
    return;
  }
  // StreamType.Arbitrary means try to play any format
  const resource = createAudioResource(fs.createReadStream(AUDIO_FILE), {
    inputType: StreamType.Arbitrary,
  });
  player.play(resource);
  console.log(`Playing: ${AUDIO_FILE}`);
}

player.on(AudioPlayerStatus.Idle, () => {
  if (LOOP) {
    // for if I give it empty file, it wont infinite loop (woops)
    setTimeout(playFile, 500);
  } else {
    console.log('Playback finished (LOOP=false).');
  }
});

player.on('error', (err) => {
  console.error('Audio player error:', err.message);
});

client.once(Events.ClientReady, async (c) => {
  console.log(`Logged in as ${c.user.tag}`);

  const guild = c.guilds.cache.get(GUILD_ID) || (await c.guilds.fetch(GUILD_ID).catch(() => null));
  if (!guild) {
    console.error(`Bot is not in guild ${GUILD_ID}, or the ID is wrong. Make sure to use the discord dev tools to invite it to this guild`);
    return;
  }

  const connection = joinVoiceChannel({
    channelId: CHANNEL_ID,
    guildId: GUILD_ID,
    adapterCreator: guild.voiceAdapterCreator,
    selfDeaf: false, // stay undeafened so it's obvious the bot is present
    selfMute: false,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 20000);
    console.log('Voice connection ready.');
  } catch (err) {
    console.error('Failed to connect to voice within 20s:', err.message);
    connection.destroy();
    return;
  }

  connection.subscribe(player);
  playFile();

  // reconnect logic
  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    try {
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling, 5000),
        entersState(connection, VoiceConnectionStatus.Connecting, 5000),]);
      console.log('Reconnecting to voice...');
    } catch {

      console.log('Disconnected for good, destroying connection.');
      connection.destroy();
    }
  });
});

// Clean shutdown on Ctrl+C
process.on('SIGINT', () => {
  console.log('\nShutting down.');
  client.destroy();
  process.exit(0);
});

client.login(TOKEN);
