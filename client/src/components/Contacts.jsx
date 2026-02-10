import React, { useState, useEffect } from "react";
import styled from "styled-components";
import Logo from "../assets/react.svg";
import Logout from "./Logout";
import { theme } from "../utils/theme";

export default function Contacts({ contacts, changeChat, onlineUsers }) {
  const [currentUserName, setCurrentUserName] = useState(undefined);
  const [currentUserImage, setCurrentUserImage] = useState(undefined);
  const [currentSelected, setCurrentSelected] = useState(undefined);

  useEffect(() => {
    const data = JSON.parse(
      localStorage.getItem("chat-app-user")
    );
    if (data) {
      setCurrentUserName(data.username);
      setCurrentUserImage(data.avatarImage);
    }
  }, []);

  const changeCurrentChat = (index, contact) => {
    setCurrentSelected(index);
    changeChat(contact);
  };

  return (
    <>
      {currentUserImage && currentUserName && (
        <Container>
          <div className="brand">
            <img src={Logo} alt="logo" />
            <h3>Chat Web</h3>
          </div>
          <div className="contacts">
            {contacts.map((contact, index) => {
              const isOnline = onlineUsers.includes(contact._id);
              return (
                <div
                  key={contact._id}
                  className={`contact ${
                    index === currentSelected ? "selected" : ""
                  }`}
                  onClick={() => changeCurrentChat(index, contact)}
                >
                  <div className="avatar">
                    <img
                      src={`data:image/svg+xml;base64,${contact.avatarImage}`}
                      alt=""
                    />
                    {isOnline && <span className="online-badge"></span>}
                  </div>
                  <div className="username">
                    <h3>{contact.username}</h3>
                    {isOnline && <span className="status-text">Online</span>}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="current-user">
            <div className="avatar">
              <img
                src={`data:image/svg+xml;base64,${currentUserImage}`}
                alt="avatar"
              />
            </div>
            <div className="username">
              <h2>{currentUserName}</h2>
            </div>
            <div className="logout">
                <Logout />
            </div>
          </div>
        </Container>
      )}
    </>
  );
}

const Container = styled.div`
  display: grid;
  grid-template-rows: 10% 75% 15%;
  overflow: hidden;
  background-color: transparent; 
  height: 100%;
  
  .brand {
    display: flex;
    align-items: center;
    gap: 1rem;
    justify-content: center;
    
    img {
      height: 2rem;
    }
    h3 {
      color: ${theme.colors.text};
      text-transform: uppercase;
      font-size: 1.2rem;
      letter-spacing: 1px;
    }
  }

  .contacts {
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: auto;
    gap: 0.8rem;
    padding-top: 1rem;

    &::-webkit-scrollbar {
      width: 0.2rem;
      &-thumb {
        background-color: ${theme.colors.surfaceLight};
        width: 0.1rem;
        border-radius: 1rem;
      }
    }

    .contact {
      background-color: rgba(255, 255, 255, 0.05);
      min-height: 5rem;
      cursor: pointer;
      width: 90%;
      border-radius: 12px;
      padding: 0.4rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      transition: all 0.3s ease;
      border: 1px solid transparent;

      &:hover {
         background-color: rgba(255, 255, 255, 0.1);
      }

      .avatar {
        position: relative;
        img {
          height: 3rem;
          width: 3rem;
          object-fit: cover;
          border-radius: 50%;
        }
        .online-badge {
            position: absolute;
            bottom: 0;
            right: 0;
            width: 12px;
            height: 12px;
            background-color: ${theme.colors.success};
            border-radius: 50%;
            border: 2px solid ${theme.colors.background};
        }
      }

      .username {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
        
        h3 {
          color: ${theme.colors.text};
          font-size: 1rem;
          font-weight: 500;
        }
        .status-text {
            color: ${theme.colors.success};
            font-size: 0.8rem;
        }
      }
    }

    .selected {
      background-color: ${theme.colors.primary} !important;
      box-shadow: 0 4px 15px rgba(154, 134, 243, 0.4);
      
      .username h3 {
          font-weight: bold;
      }
      .status-text {
          color: white;
      }
    }
  }

  .current-user {
    background-color: rgba(0, 0, 0, 0.2);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    border-top: 1px solid ${theme.colors.surfaceLight};
    
    .avatar {
      img {
        height: 3.5rem;
        width: 3.5rem;
        object-fit: cover;
        border-radius: 50%;
        border: 2px solid ${theme.colors.primary};
      }
    }
    .username {
      h2 {
        color: white;
        font-size: 1.1rem;
      }
    }
    .logout {
        margin-left: auto;
        padding-right: 1rem;
    }
    
    @media (max-width: ${theme.breakpoints.tablet}) {
      gap: 0.5rem;
      .username h2 { font-size: 1rem; }
      .avatar img { height: 3rem; width: 3rem; }
    }
  }
`;
