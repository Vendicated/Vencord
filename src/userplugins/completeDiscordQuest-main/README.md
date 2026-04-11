# CompleteDiscordQuest for Vencord 

A fork of [nicola02nb/completeDiscordQuest](https://github.com/nicola02nb/completeDiscordQuest) with advanced features including automatic captcha solving, reward code extraction, and enhanced quest automation.

## More Features 

### Automatic Captcha Solving

Automatically bypass hCaptcha challenges when accepting/completing/claiming quests. Supports multiple solving services:

- **NopeCHA** - 100 free solves per day (Recommended for free usage)
- **2Captcha** - Paid service ($1-3 per 1000 solves)
- **CapSolver** - Paid service ($0.8 per 1000 solves)
- **Auto fallback** - Free auto-click method when API services fail

**Features:**

- Token caching system (2-minute cache for efficiency)
- Automatic token cleanup to prevent memory leaks
- Multi-service support with priority order
- Real-time captcha detection and solving
- DOM-based captcha monitor for auto-detection

**WARNING:** Using captcha bypass may violate Discord Terms of Service and could risk account suspension. Use at your own risk!

### Reward Code Auto-Extraction

Automatically extracts and saves redemption codes from quest rewards:

- Scans quest claim responses for redemption codes
- Supports multiple code patterns (gift codes, redemption codes, etc.)
- Automatically appends codes to settings with quest name and timestamp
- Stores codes in dedicated setting for easy access

### Enhanced Spoofing Profiles

Advanced video progress and play activity spoofing with three speed modes:

- **Speedrun Mode** - Complete quests as fast as possible

  - Video: 60x speed, 0.15s interval, 9999s future tolerance
  - Activity heartbeat: Every 2 seconds

- **Balanced Mode** (Default) - Good speed with moderate safety

  - Video: 7x speed, 1s interval, 10s future tolerance
  - Activity heartbeat: Every 20 seconds

- **Stealth Mode** - Slower, more realistic progress
  - Video: 1x speed, 1s interval, 5s future tolerance
  - Activity heartbeat: Every 25 seconds

### Reward Type Filtering

Only accept and complete quests with specific reward types:

- **Any reward** (default)
- **Nitro / Nitro trials** - Only Nitro rewards
- **Avatar decoration** - Only profile decorations
- **In-game item / DLC** - Only game items
- **Shop currency / Orbs** - Only currency rewards

### Enhanced Error Handling

Robust retry mechanism with exponential backoff:

- Configurable max retries and delays
- Automatic retry for failed API calls
- Detailed error logging for debugging
- Graceful degradation when services fail

### UI Customization

Multiple locations for quest buttons with badge counters:

- Top bar button (default)
- Settings bar button
- Quest badges showing available/completable quest counts
- Option to disable all UI rendering (headless mode)

### Advanced Settings

**Voice Channel Integration:**

- Configure preferred voice channel ID for streaming quests
- Auto-join voice channel when streaming quest starts
- Auto-invite specific user ID when quest stream begins

**Captcha Settings:**

- Choose captcha solving service preference
- Configure API keys for multiple services
- Select fallback method (auto-click or manual)

**Other Settings:**

- Disable UI rendering for fully automated operation
- View and manage saved redemption codes
- Choose quest acceptance and claiming behavior

## Installation

1. Install [Vencord](https://vencord.dev/)
2. Clone this repository into your Vencord plugins directory:
   ```bash
   cd Vencord/src/userplugins
   git clone https://github.com/Talya1412/completeDiscordQuest.git
   ```
3. Reinject Vencord
   ```bash
   cd Vencord
   pnpm inject
   ```
5. Enable the plugin in Vencord settings

## Configuration

All settings are available in Vencord Settings → Plugins → CompleteDiscordQuest:

1. **Basic Settings:**

   - Enable auto-accept quests
   - Enable auto-claim rewards
   - Choose preferred reward type

2. **Captcha Solving (Optional):**

   - Enable auto-captcha solving
   - Choose solving service
   - Add API key(s) for chosen service(s)

3. **Speed & Stealth:**

   - Select spoofing speed mode
   - Configure voice channel preferences

4. **UI Options:**
   - Show/hide quest buttons
   - Enable/disable quest badges
   - Toggle UI rendering

## Getting API Keys

### NopeCHA (Recommended - 100 Free/Day)

1. Visit [nopecha.com](https://nopecha.com)
2. Create account and go to Settings → API Key
3. Copy key (format: `pk_nopecha_xxxxxxxx`) and paste in plugin settings

### 2Captcha

1. Visit [2captcha.com](https://2captcha.com)
2. Register and get your API key
3. Paste 32-character key in plugin settings

### CapSolver

1. Visit [capsolver.com](https://capsolver.com)
2. Register and get your API key
3. Copy key (format: `CAP-xxxxxxxx`) and paste in plugin settings

## How It Works

1. **Quest Detection:** Monitors Discord's quest store for new quests
2. **Auto-Accept:** Automatically enrolls in quests matching your reward preference
3. **Quest Completion:** Spoofs video watching or game activity based on quest type
4. **Captcha Handling:** If captcha appears, automatically solves using configured service
5. **Reward Claiming:** Claims rewards and extracts redemption codes
6. **Code Storage:** Saves codes with quest name and timestamp for later use

## Disclaimer

**USE AT YOUR OWN RISK!** This plugin:

- Automates quest completion which may violate Discord ToS
- Uses captcha solving services which Discord actively blocks

The developers are not responsible for any consequences of using this plugin.

## Credits

- Original snippet by [aamiaa](https://github.com/aamiaa)
- Original Vencord port by [nicola02nb](https://github.com/nicola02nb/completeDiscordQuest)
- Fork by [Talya1412](https://github.com/Talya1412)


## License

GPL-3.0-or-later
