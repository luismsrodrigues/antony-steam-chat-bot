const STEAM_USER = require("steam-user");
const AXIOS = require('axios');

function GenerateSteamUserConnection({username, password}) {
    let steamUser = new STEAM_USER();
    steamUser.logOn({
        accountName: username,
        password
    });

    return steamUser;
}

function SetupClientManagement({ CLIENT_STEAM_MANAGEMENT }) {
    CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.on("loggedOn", () => {
        // CLIENT_STEAM_MANAGEMENT.getPersonas();
        CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.chat.getGroups((e , w) => {
            Object.keys(w.chat_room_groups).forEach(element => {
                let chatGroup = w.chat_room_groups[element].group_summary;

                console.log("CHAT GROUP ID: " + chatGroup.chat_group_id);
                console.log("CHAT GROUP NAME: " + chatGroup.chat_group_name);

                chatGroup.chat_rooms.forEach(chatRoom => {
                    if(!chatRoom.chat_name){
                        console.log("   |> CHAT ROOM NAME: DEFAULT");
                    }else{
                        console.log("   |> CHAT ROOM NAME: " + chatRoom.chat_name);
                    }
                    console.log("   |> CHAT ROOM ID: " + chatRoom.chat_id);
                });

                console.log("--------------------------------------------------------------------");
            });
        })
    });
}

function AddCommandToChat({CLIENT_STEAM_MANAGEMENT, CHAT_NAME_ON_APP = "", commandText, commandDescription, commandCallback, commandTimeOut}) {
    if(!commandCallback || !(typeof commandCallback === 'function')){
        console.error(`Invalid callback on command: ${commandText}`)
    }

    CLIENT_STEAM_MANAGEMENT.Chats[CHAT_NAME_ON_APP].Commands.push({
        commandText, 
        commandDescription, 
        commandCallback, 
        commandTimeOut
    });

    return CLIENT_STEAM_MANAGEMENT.Chats[CHAT_NAME_ON_APP];
}

function AddChatToClient({CLIENT_STEAM_MANAGEMENT, CHAT: { CHAT_GROUP_ID = null, CHAT_ROOM_ID = null, CHAT_NAME_ON_APP = "", NOTIFY}}) {
    CLIENT_STEAM_MANAGEMENT.Chats[CHAT_NAME_ON_APP] = {
        ChatGroupId: CHAT_GROUP_ID,
        ChatRoomId: CHAT_ROOM_ID,
        Commands: [],
        Notify: NOTIFY,
        AddCommand: ({commandText, commandDescription, commandCallback, commandTimeOut}) => AddCommandToChat({CLIENT_STEAM_MANAGEMENT, CHAT_NAME_ON_APP, commandText, commandDescription, commandCallback, commandTimeOut})
    }

    return CLIENT_STEAM_MANAGEMENT;
}

function ChatManagement({CLIENT_STEAM_MANAGEMENT, Chat, SenderSteamId, steamApiKey}) {
    
    async function GetUserName() {
        return await AXIOS.get(`http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/?key=${steamApiKey}&steamids=${SenderSteamId.getSteamID64()}`);
    }

    async function MentionSenderPrivate(chatManagement, message = "") {
        if(message.includes(chatManagement.Mention.Sender)){
            let result = await GetUserName();
            message = message.replace(chatManagement.Mention.Sender, `[mention=${SenderSteamId.accountid}]@${result.data.response.players[0].personaname}[/mention]`);
        }
        
        return message;
    }

    let ChatManagement = {
        Mention: {
            Sender: "[@&&$]SENDER[@&&$]",
            All: "[@&&$]ALL[@&&$]"
        },
        Answer: async function (message) {
            message = await MentionSenderPrivate(this, message);
            CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.chat.sendChatMessage(Chat.ChatGroupId, Chat.ChatRoomId, message);
        },
    }

    return ChatManagement;
}

module.exports = function({username, password, api_Key}) {
    const STEAM_USER_CLIENT = GenerateSteamUserConnection({username, password});

    let CLIENT_STEAM_MANAGEMENT = {
        //props
        STEAM_USER_CLIENT,
        Chats: {
            "DEFAULT": {
                ChatGroupId: 0,
                ChatRoomId: 0,
                Commands: [],
                AddCommand: ({commandText, commandDescription, commandCallback = (Chat = {Answer, Mention: {Sender}}) => null, commandTimeOut}) => null 
            }
        },

        //Functions
        HelpOnConfig: () => SetupClientManagement({CLIENT_STEAM_MANAGEMENT}),
        AddChat: ({ CHAT_GROUP_ID = null, CHAT_ROOM_ID = null, CHAT_NAME_ON_APP = "", NOTIFY}) => AddChatToClient({CLIENT_STEAM_MANAGEMENT: CLIENT_STEAM_MANAGEMENT, CHAT: { CHAT_GROUP_ID , CHAT_ROOM_ID , CHAT_NAME_ON_APP, NOTIFY }}),
        Start: function () {
            let chatNames = Object.keys(CLIENT_STEAM_MANAGEMENT.Chats);

            if(chatNames.length == 0){
                console.log("Missing chats, add chats!");
                return;
            }

            let existsCommands = false;

            chatNames.find(chatName => {
                if(CLIENT_STEAM_MANAGEMENT.Chats[chatName].Commands.length > 0){
                    existsCommands = true;
                }
            });

            if(!existsCommands){
                console.log("Missing commands on chats.");
                return;
            }

            CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.on("loggedOn", () => {
                Object.keys(CLIENT_STEAM_MANAGEMENT.Chats).forEach(chatName => {
                    let chat = CLIENT_STEAM_MANAGEMENT.Chats[chatName];
                    
                    if(!chat.Notify){
                        return;
                    }

                    CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.chat.sendChatMessage(chat.ChatGroupId, chat.ChatRoomId, "BOT ANTONY CONNECTED.");
                });
            });

            CLIENT_STEAM_MANAGEMENT.STEAM_USER_CLIENT.chat.on("chatMessage", async ({ chat_group_id, chat_id, steamid_sender, message, server_timestamp, mentions }) => {
                Object.keys(CLIENT_STEAM_MANAGEMENT.Chats).forEach(chatName => {
                    let chat = CLIENT_STEAM_MANAGEMENT.Chats[chatName];

                    if(chat.ChatGroupId != chat_group_id || chat.ChatRoomId != chat_id){
                        return;
                    }

                    let command = chat.Commands.find(command => command.commandText == message);
                    command.commandCallback(ChatManagement({CLIENT_STEAM_MANAGEMENT, Chat: chat, SenderSteamId: steamid_sender, steamApiKey: api_Key}));
                });
            });
        }
    };

    CLIENT_STEAM_MANAGEMENT.Chats = {};

    return CLIENT_STEAM_MANAGEMENT;
};