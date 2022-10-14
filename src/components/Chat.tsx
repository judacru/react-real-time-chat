import React from "react";
import { useParams } from "react-router-dom";
import { IoMdSend } from "react-icons/io";
import Message from "./Message";
import { Dict, User } from "../interfaces";
import { getPic } from "../utils/img";

type ChatProps = {
    users: Dict<User>;
    sendMessageHandler: (toUser: string, message: string) => Promise<void>;
    startConversationHandler: (toUser: string) => Promise<void>;

}

export default function Chat({ users, sendMessageHandler, startConversationHandler }: ChatProps) {
    const { user } = useParams();
    const [message, setMessage] = React.useState(" ");

    React.useEffect(() => {
        if (user && !users[user].publicKey) {
            startConversationHandler(user);
        }
    }, [users, user, startConversationHandler]);

    const onSendMessageClick = async () => {
        if (user && message.length > 0) {
            await sendMessageHandler(user, message);
            setMessage("");
        }
    }

    return (
        <div className="chat">
            <div className="profile">
                <img src={getPic(user!)} alt="Profile pic" className="profile-pic" />
            </div>
            <div className="messages">
                {user && users[user].messages && users[user].messages.map((message, index) => <Message {...message} />)}
            </div>
            <div className="message-form">
                <input type="text" className="form-input" value={message} onChange={e => setMessage(e.target.value)} />
                <button className="btn-icon" onClick={() => onSendMessageClick()}>
                    <IoMdSend />
                </button>
            </div>
        </div>
    )


}