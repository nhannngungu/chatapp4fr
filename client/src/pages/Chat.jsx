import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import styled from "styled-components";
import { allUsersRoute, host } from "../utils/APIRoutes";
import ChatContainer from "../components/ChatContainer";
import Contacts from "../components/Contacts";
import Welcome from "../components/Welcome";
import VideoCall from "../components/VideoCall";
import { theme } from "../utils/theme";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);

  // Check User Session
  useEffect(() => {
    async function checkUser() {
      if (!localStorage.getItem("chat-app-user")) {
        navigate("/login");
      } else {
        setCurrentUser(await JSON.parse(localStorage.getItem("chat-app-user")));
        setIsLoaded(true);
        if ("Notification" in window && Notification.permission !== "granted") {
          Notification.requestPermission();
        }
      }
    }
    checkUser();
  }, []);

  // Initialize Socket
  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);
      socket.current.emit("add-user", currentUser._id);
      
      socket.current.on("online-users-list", (users) => setOnlineUsers(users));
      socket.current.on("user-online", (userId) => setOnlineUsers((prev) => [...prev, userId]));
      socket.current.on("user-offline", (userId) => setOnlineUsers((prev) => prev.filter((id) => id !== userId)));
      
      socket.current.on("call-user", (data) => {
        setIncomingCallData(data);
        setIsVideoCallActive(true);
      });
    }
  }, [currentUser]);

  // Load Contacts
  useEffect(() => {
    async function getContacts() {
      if (currentUser) {
        if (currentUser.isAvatarImageSet) {
          const data = await axios.get(`${allUsersRoute}/${currentUser._id}`);
          setContacts(data.data);
        } else {
          navigate("/setAvatar");
        }
      }
    }
    getContacts();
  }, [currentUser]);

  const handleChatChange = (chat) => {
    setCurrentChat(chat);
  };

  const handleBackToContacts = () => {
    setCurrentChat(undefined);
  };

  return (
    <Container $isChatSelected={currentChat !== undefined}>
      <div className="container">
        <div className="contacts-container">
          <Contacts contacts={contacts} changeChat={handleChatChange} onlineUsers={onlineUsers} />
        </div>
        <div className="chat-container">
          {isLoaded && currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer 
                currentChat={currentChat} 
                currentUser={currentUser} 
                socket={socket} 
                onVideoCall={() => setIsVideoCallActive(true)}
                onBack={handleBackToContacts}
            />
          )}
        </div>
      </div>
      
      {isVideoCallActive && (
          <VideoCall 
              socket={socket} 
              currentUser={currentUser} 
              currentChat={currentChat} 
              incomingCallData={incomingCallData}
              endCallParent={() => {
                  setIsVideoCallActive(false);
                  setIncomingCallData(null);
              }}
          />
      )}
    </Container>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${theme.colors.background};
  background-image: radial-gradient(circle at 50% 50%, #202040 0%, ${theme.colors.background} 100%);
  
  .container {
    height: 90vh;
    width: 90vw;
    background-color: ${theme.colors.surface};
    backdrop-filter: blur(10px);
    border-radius: 20px;
    border: 1px solid ${theme.colors.surfaceLight};
    box-shadow: ${theme.shadows.card};
    display: grid;
    grid-template-columns: 1fr; 
    overflow: hidden;
    transition: all 0.3s ease;

    /* Mobile First Logic */
    .contacts-container {
      display: ${(props) => (props.$isChatSelected ? "none" : "block")};
      height: 100%;
      width: 100%;
      overflow: hidden;
    }
    
    .chat-container {
      display: ${(props) => (props.$isChatSelected ? "block" : "none")};
      height: 100%;
      width: 100%;
      overflow: hidden;
    }

    /* Tablet & Desktop */
    @media (min-width: ${theme.breakpoints.tablet}) {
      grid-template-columns: 35% 65%;
      
      .contacts-container {
        display: block;
        border-right: 1px solid ${theme.colors.surfaceLight};
      }
      
      .chat-container {
        display: block;
      }
    }

    @media (min-width: ${theme.breakpoints.desktop}) {
      grid-template-columns: 25% 75%;
    }

    /* Mobile Fullscreen Override */
    @media (max-width: ${theme.breakpoints.tablet}) {
      height: 100vh;
      width: 100vw;
      border-radius: 0;
      border: none;
    }
  }
`;
