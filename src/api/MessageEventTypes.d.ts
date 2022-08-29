export interface Message {
    id:               string;
    type:             number;
    channel_id:       string;
    author:           Author;
    content:          string;
    attachments:      any[];
    embeds:           any[];
    mentions:         any[];
    mentionRoles:     any[];
    mentionChannels:  any[];
    mentioned:        boolean;
    pinned:           boolean;
    mentionEveryone:  boolean;
    tts:              boolean;
    codedLinks:       any[];
    giftCodes:        any[];
    timestamp:        Date;
    editedTimestamp:  null;
    state:            string;
    nonce:            null;
    blocked:          boolean;
    call:             null;
    bot:              boolean;
    webhookId:        null;
    reactions:        any[];
    applicationId:    null;
    application:      null;
    activity:         null;
    messageReference: null;
    flags:            number;
    isSearchHit:      boolean;
    stickers:         any[];
    stickerItems:     any[];
    components:       any[];
    loggingName:      null;
    interaction:      null;
    interactionData:  null;
    interactionError: null;
}

export interface Author {
    id:                 string;
    username:           string;
    discriminator:      string;
    avatar:             string;
    avatarDecoration:   null;
    email:              null;
    verified:           boolean;
    bot:                boolean;
    system:             boolean;
    mfaEnabled:         boolean;
    mobile:             boolean;
    desktop:            boolean;
    flags:              number;
    publicFlags:        number;
    purchasedFlags:     number;
    premiumUsageFlags:  number;
    phone:              null;
    guildMemberAvatars: GuildMemberAvatars;
}

export interface GuildMemberAvatars {}



export interface Channel {
    id:                            string;
    name:                          string;
    topic:                         string;
    position:                      number;
    recipients:                    string[];
    rawRecipients:                 RawRecipient[];
    type:                          number;
    guild_id:                      null;
    bitrate:                       number;
    flags:                         number;
    permissionOverwrites:          Nicks;
    userLimit:                     number;
    nicks:                         Nicks;
    nsfw:                          boolean;
    rateLimitPerUser:              number;
    defaultThreadRateLimitPerUser: number;
    lastMessageId:                 string;
    availableTags:                 any[];
    appliedTags:                   any[];
}

export interface Nicks {
}

export interface RawRecipient {
    avatar:            string;
    avatar_decoration: null;
    bot:               boolean;
    discriminator:     string;
    id:                string;
    public_flags:      number;
    username:          string;
}