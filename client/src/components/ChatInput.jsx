import React, { useState, useRef } from "react";
import styled from "styled-components";
import EmojiPicker from "emoji-picker-react";
import { IoMdSend } from "react-icons/io";
import { BsEmojiSmileFill, BsImage, BsMicFill } from "react-icons/bs";
import axios from "axios";
import { uploadImageRoute } from "../utils/APIRoutes";

export default function ChatInput({ handleSendMsg, handleTyping }) {
  const [msg, setMsg] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const fileInputRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleEmojiClick = (emojiObject) => {
    let message = msg;
    message += emojiObject.emoji;
    setMsg(message);
    triggerTyping();
  };

  const triggerTyping = () => {
    handleTyping(true);
    if (typingTimeout) clearTimeout(typingTimeout);
    const timeout = setTimeout(() => {
        handleTyping(false);
    }, 2000);
    setTypingTimeout(timeout);
  }

  const sendChat = (event) => {
    event.preventDefault();
    if (msg.length > 0) {
      handleSendMsg(msg, "text");
      setMsg("");
      handleTyping(false);
      if (typingTimeout) clearTimeout(typingTimeout);
    }
  };

  const handleFileChange = async (e) => {
      const file = e.target.files[0];
      if (file) {
          const formData = new FormData();
          formData.append("file", file);
          try {
              const res = await axios.post(uploadImageRoute, formData, {
                  headers: { "Content-Type": "multipart/form-data" },
              });
              handleSendMsg(res.data.path, "image");
          } catch (err) {
              console.error(err);
          }
      }
  };

  const startRecording = async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunksRef.current.push(event.data);
            }
        };

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
            const audioFile = new File([audioBlob], "voice_message.mp3", { type: "audio/mp3" });
            
            const formData = new FormData();
            formData.append("file", audioFile);
            
            try {
                const res = await axios.post(uploadImageRoute, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                handleSendMsg(res.data.path, "audio");
            } catch (err) {
                console.error("Error uploading voice message:", err);
            }
            
            // Stop all tracks to release microphone
            stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Không thể truy cập microphone. Vui lòng kiểm tra quyền truy cập.");
    }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
      }
  };

  return (
    <Container>
      <div className="button-container">
        <div className="emoji">
          <BsEmojiSmileFill onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
          {showEmojiPicker && (
              <div className="emoji-picker-wrapper">
                  <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width={300} height={400} />
              </div>
          )}
        </div>
        <div className="upload-image">
            <BsImage onClick={() => fileInputRef.current.click()} />
            <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} accept="image/*" />
        </div>
        <div className={`voice-record ${isRecording ? "recording" : ""}`}>
            <BsMicFill 
                onMouseDown={startRecording} 
                onMouseUp={stopRecording} 
                onTouchStart={startRecording} 
                onTouchEnd={stopRecording} 
                title="Giữ để ghi âm"
            />
        </div>
      </div>
      <form className="input-container" onSubmit={(event) => sendChat(event)}>
        <input
          type="text"
          placeholder={isRecording ? "Đang ghi âm..." : "Nhập tin nhắn..."}
          onChange={(e) => {
            setMsg(e.target.value);
            triggerTyping();
          }}
          value={msg}
          disabled={isRecording}
        />
        <button type="submit">
          <IoMdSend />
        </button>
      </form>
    </Container>
  );
}

const Container = styled.div`
  display: grid;
  align-items: center;
  grid-template-columns: 15% 85%;
  background-color: #080420;
  padding: 0 2rem;
  padding-bottom: 0.3rem;
  height: 100%;
  
  @media screen and (min-width: 720px) and (max-width: 1080px) {
    padding: 0 1rem;
    gap: 1rem;
  }
  
  @media screen and (max-width: 720px) {
      grid-template-columns: 20% 80%;
      padding: 0 0.5rem;
      padding-bottom: 0.3rem;
  }

  .button-container {
    display: flex;
    align-items: center;
    color: white;
    gap: 1rem;
    
    @media screen and (max-width: 720px) {
        gap: 0.5rem;
    }

    .emoji {
      position: relative;
      svg {
        font-size: 1.5rem;
        color: #ffff00c8;
        cursor: pointer;
      }
      .emoji-picker-wrapper {
        position: absolute;
        top: -450px;
        left: 0;
        z-index: 1000;
        background-color: #080420;
        box-shadow: 0 5px 10px #9a86f3;
        border-color: #9a86f3;
        
        @media screen and (max-width: 720px) {
            top: -350px;
            left: -10px;
            
            .EmojiPickerReact {
                width: 280px !important;
                height: 350px !important;
            }
        }

        .emoji-scroll-wrapper::-webkit-scrollbar {
          background-color: #080420;
          width: 5px;
          &-thumb {
            background-color: #9a86f3;
          }
        }
        .emoji-categories {
          button {
            filter: contrast(0);
          }
        }
        .emoji-search {
          background-color: transparent;
          border-color: #9a86f3;
        }
        .emoji-group:before {
          background-color: #080420;
        }
      }
    }
    .upload-image svg {
        font-size: 1.5rem;
        color: #00bfff;
        cursor: pointer;
    }
    .voice-record {
        svg {
            font-size: 1.5rem;
            color: #ffffff;
            cursor: pointer;
            transition: 0.3s ease-in-out;
        }
        &.recording svg {
            color: #ff0000;
            transform: scale(1.2);
            animation: pulse 1s infinite;
        }
    }
  }
  .input-container {
    width: 100%;
    border-radius: 2rem;
    display: flex;
    align-items: center;
    gap: 2rem;
    background-color: #ffffff34;
    input {
      width: 90%;
      height: 60%;
      background-color: transparent;
      color: white;
      border: none;
      padding-left: 1rem;
      font-size: 1.2rem;

      &::selection {
        background-color: #9a86f3;
      }
      &:focus {
        outline: none;
      }
    }
    button {
      padding: 0.3rem 2rem;
      border-radius: 2rem;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: #9a86f3;
      border: none;
      @media screen and (min-width: 720px) and (max-width: 1080px) {
        padding: 0.3rem 1rem;
        svg {
          font-size: 1rem;
        }
      }
      svg {
        font-size: 2rem;
        color: white;
      }
    }
  }
  
  @keyframes pulse {
      0% { transform: scale(1); }
      50% { transform: scale(1.2); }
      100% { transform: scale(1); }
  }
`;
