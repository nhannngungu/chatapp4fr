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
import { playNotificationSound, showBrowserNotification } from "../utils/notificationUtils";

export default function Chat() {
  const navigate = useNavigate();
  const socket = useRef();
  const [contacts, setContacts] = useState([]);
  const [currentChat, setCurrentChat] = useState(undefined);
  const currentChatRef = useRef(undefined); // Ref to track currentChat in socket listeners
  const contactsRef = useRef([]); // Ref to track contacts
  const [currentUser, setCurrentUser] = useState(undefined);
  const [isLoaded, setIsLoaded] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isVideoCallActive, setIsVideoCallActive] = useState(false);
  const [incomingCallData, setIncomingCallData] = useState(null);

  useEffect(() => {
    currentChatRef.current = currentChat;
  }, [currentChat]);

  useEffect(() => {
    contactsRef.current = contacts;
  }, [contacts]);

  useEffect(() => {
    async function checkUser() {
      if (!localStorage.getItem("chat-app-user")) {
        navigate("/login");
      } else {
        setCurrentUser(
          await JSON.parse(localStorage.getItem("chat-app-user"))
        );
        setIsLoaded(true);
        
        // Request notification permission on load
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }
    }
    checkUser();
  }, []);

  useEffect(() => {
    if (currentUser) {
      socket.current = io(host);
      socket.current.emit("add-user", currentUser._id);
      
      socket.current.on("online-users-list", (users) => {
        setOnlineUsers(users);
      });
      socket.current.on("user-online", (userId) => {
        setOnlineUsers((prev) => [...prev, userId]);
      });
      socket.current.on("user-offline", (userId) => {
        setOnlineUsers((prev) => prev.filter((id) => id !== userId));
      });
      socket.current.on("call-user", (data) => {
        setIncomingCallData(data);
        setIsVideoCallActive(true);
      });
    }
  }, [currentUser]);

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

  return (
    <>
      <Container>
        <div className="container">
          <Contacts contacts={contacts} changeChat={handleChatChange} onlineUsers={onlineUsers} />
          {isLoaded && currentChat === undefined ? (
            <Welcome />
          ) : (
            <ChatContainer 
                currentChat={currentChat} 
                currentUser={currentUser} 
                socket={socket} 
                onVideoCall={() => setIsVideoCallActive(true)}
            />
          )}
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
    </>
  );
}

const Container = styled.div`
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1rem;
  align-items: center;
  background-color: #131324;
  .container {
    height: 85vh;
    width: 85vw;
    background-color: #00000076;
    display: grid;
    grid-template-columns: 25% 75%;
    @media screen and (min-width: 720px) and (max-width: 1080px) {
      grid-template-columns: 35% 65%;
    }
  }
`;
