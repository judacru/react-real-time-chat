import React from "react";


type MessageProps = {
    text: string;
    date: Date;
    reply: boolean;
};

const Message = ({ text, date, reply }: MessageProps) => 
   (<div className={`message ${reply ? 'reply' : ''}`} title={date.toLocaleString()}>
        <div className="message-bubble">
            <div className="text">{text}</div>
        </div>
    </div>)
export default Message;
