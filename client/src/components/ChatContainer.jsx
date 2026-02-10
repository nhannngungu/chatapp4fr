import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import ChatInput from "./ChatInput";
import axios from "axios";
import { sendMessageRoute, receiveMessageRoute, host, addReactionRoute } from "../utils/APIRoutes";
import { v4 as uuidv4 } from "uuid";
import { BsCameraVideoFill, BsHeart, BsHeartFill, BsArrowLeft } from "react-icons/bs";

export default function ChatContainer({ currentChat, currentUser, socket, onVideoCall, onBack }) {
  const [messages, setMessages] = useState([]);
  const scrollRef = useRef();
  const [arrivalMessage, setArrivalMessage] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const [arrivalReaction, setArrivalReaction] = useState(null);

  useEffect(() => {
    async function fetchData() {
      if (currentChat) {
        const response = await axios.post(receiveMessageRoute, {
          from: currentUser._id,
          to: currentChat._id,
        });
        setMessages(response.data);
      }
    }
    fetchData();
  }, [currentChat]);

  const handleSendMsg = async (msg, type = "text") => {
    socket.current.emit("stop-typing", {
      to: currentChat._id,
      from: currentUser._id,
    });
    const { data } = await axios.post(sendMessageRoute, {
      from: currentUser._id,
      to: currentChat._id,
      message: msg,
      type: type,
    });
    
    socket.current.emit("send-msg", {
      to: currentChat._id,
      from: currentUser._id,
      msg: { message: msg, type: type },
      // Note: We don't send ID here via socket usually, or we should.
      // But for consistency, let's just append locally.
      // The receiver will load ID only if they reload or if we send it.
      // For now, receiver won't be able to react to this message immediately unless we send ID.
      // Let's improve "send-msg" payload to include ID if possible, but data.data._id is what we need.
      id: data.data._id
    });

    const msgs = [...messages];
    msgs.push({ fromSelf: true, message: msg, type: type, id: data.data._id, reactions: [] });
    setMessages(msgs);
  };

  const handleReaction = async (msgId, emoji) => {
    if (!msgId) return;
    await axios.post(addReactionRoute, {
        messageId: msgId,
        emoji: emoji,
        from: currentUser._id
    });

    socket.current.emit("add-reaction", {
        to: currentChat._id,
        messageId: msgId,
        emoji: emoji,
        from: currentUser._id
    });

    const msgs = [...messages];
    const msgIndex = msgs.findIndex(m => m.id === msgId);
    if(msgIndex >= 0) {
        if(!msgs[msgIndex].reactions) msgs[msgIndex].reactions = [];
        const existing = msgs[msgIndex].reactions.find(r => r.from === currentUser._id);
        if(existing) existing.emoji = emoji;
        else msgs[msgIndex].reactions.push({ emoji, from: currentUser._id });
        setMessages(msgs);
    }
  };

  const handleTyping = (typing) => {
    if (socket.current) {
        if (typing) {
            socket.current.emit("typing", {
                to: currentChat._id,
                from: currentUser._id,
            });
        } else {
            socket.current.emit("stop-typing", {
                to: currentChat._id,
                from: currentUser._id,
            });
        }
    }
  }

  useEffect(() => {
    if (socket.current) {
      socket.current.on("msg-recieve", (data) => {
        // Only accept messages from the current chat user
        if (data.from === currentChat._id) {
            setArrivalMessage({ fromSelf: false, message: data.message, type: data.type, id: data.id, reactions: [] });
        }
      });
      socket.current.on("typing-recieve", (from) => {
        if (from === currentChat._id) setIsTyping(true);
      });
      socket.current.on("stop-typing-recieve", (from) => {
        if (from === currentChat._id) setIsTyping(false);
      });
      socket.current.on("reaction-recieve", (data) => {
        setArrivalReaction(data);
      });
    }
  }, [currentChat]);

  useEffect(() => {
    arrivalMessage && setMessages((prev) => [...prev, arrivalMessage]);
  }, [arrivalMessage]);

  useEffect(() => {
    if (arrivalReaction) {
      setMessages((prev) => {
        const msgs = [...prev];
        const msgIndex = msgs.findIndex((m) => m.id === arrivalReaction.messageId);
        if (msgIndex >= 0) {
          if (!msgs[msgIndex].reactions) msgs[msgIndex].reactions = [];
          const existing = msgs[msgIndex].reactions.find((r) => r.from === arrivalReaction.from);
          if (existing) existing.emoji = arrivalReaction.emoji;
          else msgs[msgIndex].reactions.push({ emoji: arrivalReaction.emoji, from: arrivalReaction.from });
        }
        return msgs;
      });
    }
  }, [arrivalReaction]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  return (
    <Container>
      <div className="chat-header">
        <div className="user-details">
          {onBack && (
            <div className="back-button" onClick={onBack}>
                <BsArrowLeft />
            </div>
          )}
          <div className="avatar">
            <img
              src={`data:image/svg+xml;base64,${currentChat?.avatarImage}`}
              alt=""
            />
          </div>
          <div className="username">
            <h3>{currentChat?.username}</h3>
            {isTyping && <span className="typing">đang soạn tin...</span>}
          </div>
        </div>
        <div className="chat-actions">
            <BsCameraVideoFill onClick={onVideoCall} />
        </div>
      </div>
      <div className="chat-messages">
        {messages.map((message) => {
          return (
            <div ref={scrollRef} key={uuidv4()}>
              <div
                className={`message ${
                  message.fromSelf ? "sended" : "recieved"
                }`}
              >
                <div className="content">
                  {message.type === "text" ? (
                      <p>{message.message}</p>
                  ) : message.type === "image" ? (
                      <img src={`${host}/uploads/${message.message}`} alt="sent-image" />
                  ) : message.type === "audio" ? (
                      <audio controls src={`${host}/uploads/${message.message}`} />
                  ) : null}
                  <div className="reaction-area">
                      {message.reactions && message.reactions.length > 0 && (
                          <span className="reaction-count">❤️ {message.reactions.length}</span>
                      )}
                      <BsHeart className="reaction-btn" onClick={() => handleReaction(message.id, "❤️")} />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {isTyping && (
            <div ref={scrollRef} className="message recieved">
                <div className="content typing-indicator">
                    <span>.</span><span>.</span><span>.</span>
                </div>
            </div>
        )}
      </div>
      <ChatInput handleSendMsg={handleSendMsg} handleTyping={handleTyping} />
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 80% 10%;
  gap: 0.1rem;
  overflow: hidden;
  height: 100%;

  @media screen and (min-width: 720px) and (max-width: 1080px) {
    grid-template-rows: 15% 70% 15%;
  }

  @media screen and (max-width: 720px) {
    grid-template-rows: 10% 80% 10%;
    .chat-header {
        padding: 0 1rem;
    }
    .chat-messages {
        padding: 1rem;
    }
  }

  .chat-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 2rem;
    
    .user-details {
      display: flex;
      align-items: center;
      gap: 1rem;
      
      .back-button {
          display: none;
          cursor: pointer;
          svg {
              color: white;
              font-size: 1.5rem;
          }
          @media screen and (max-width: 720px) {
              display: flex;
              align-items: center;
          }
      }

      .avatar {
        img {
          height: 3rem;
          width: 3rem;
          object-fit: cover;
        }
      }
      .username {
        h3 {
          color: white;
          font-size: 1.1rem;
        }
        .typing {
            font-size: 0.8rem;
            color: #ccc;
            margin-left: 0.5rem;
            font-style: italic;
        }
      }
    }
    .chat-actions {
        svg {
            color: #9a86f3;
            font-size: 1.5rem;
            cursor: pointer;
            &:hover {
                color: white;
            }
        }
    }
  }
  .chat-messages {
    padding: 1rem 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow: auto;
    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: #ffffff39;
        width: 0.1rem;
        border-radius: 1rem;
      }
    }
    .message {
      display: flex;
      align-items: center;
      .content {
        max-width: 40%;
        overflow-wrap: break-word;
        padding: 1rem;
        font-size: 1.1rem;
        border-radius: 1rem;
        color: #d1d1d1;
        
        @media screen and (min-width: 720px) and (max-width: 1080px) {
          max-width: 70%;
        }
        @media screen and (max-width: 720px) {
            max-width: 85%;
            font-size: 1rem;
            padding: 0.5rem 1rem;
        }

        img {
            max-width: 300px;
            max-height: 300px;
             border-radius: 1rem;
             @media screen and (max-width: 720px) {
                 max-width: 200px;
                 max-height: 200px;
             }
         }
         .reaction-area {
             display: flex;
             align-items: center;
             justify-content: space-between;
             margin-top: 5px;
             min-height: 20px;
             .reaction-count {
                 font-size: 0.8rem;
                 background: #ffffff20;
                 padding: 2px 5px;
                 border-radius: 5px;
             }
             .reaction-btn {
                 cursor: pointer;
                 opacity: 0;
                 transition: 0.2s;
                 margin-left: 10px;
             }
         }
         &:hover .reaction-btn {
             opacity: 1;
         }
       }
       .typing-indicator {
        display: flex;
        gap: 0.3rem;
        span {
            animation: blink 1s infinite;
            &:nth-child(2) { animation-delay: 0.2s; }
            &:nth-child(3) { animation-delay: 0.4s; }
        }
        @keyframes blink {
            0% { opacity: 0.2; }
            50% { opacity: 1; }
            100% { opacity: 0.2; }
        }
      }
    }
    .sended {
      justify-content: flex-end;
      .content {
        background-color: #4f04ff21;
      }
    }
    .recieved {
      justify-content: flex-start;
      .content {
        background-color: #9900ff20;
      }
    }
  }
`;
