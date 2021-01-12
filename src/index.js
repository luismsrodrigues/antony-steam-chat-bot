require("dotenv/config");
const CLIENT_STEAM_MANAGEMENT = require("./client-steam-management")({
    username: process.env.ACCOUNT_NAME,
    password: process.env.ACCOUNT_PASSWORD,
    api_Key: process.env.STEAM_API_KEY
});

// CLIENT_STEAM_MANAGEMENT.HelpOnConfig(); //GROUP CHAT ID 17074717 ROOM ID 57021246

CLIENT_STEAM_MANAGEMENT.AddChat({CHAT_GROUP_ID: 17074717 , CHAT_ROOM_ID: 57021246, CHAT_NAME_ON_APP: "DEFAULT", NOTIFY: true});
CLIENT_STEAM_MANAGEMENT.AddChat({CHAT_GROUP_ID: 17053990 , CHAT_ROOM_ID: 56943144, CHAT_NAME_ON_APP: "AGENCY_PT_FUN"});


CLIENT_STEAM_MANAGEMENT.Chats["DEFAULT"].AddCommand({
    commandText: "/test",
    commandDescription: "Test Command",
    commandTimeOut: 2,
    commandCallback: async (chat) => {
        await chat.Answer("Test Message " + chat.Mention.Sender);
    }
}).AddCommand({
    commandText: "/hello",
    commandDescription: "Hello Command",
    commandTimeOut: 2,
    commandCallback: async (chat) => {
        await chat.Answer("Hello " + chat.Mention.Sender);
    }
});

CLIENT_STEAM_MANAGEMENT.Start();