import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Peer from "simple-peer";
import { 
    BsCameraVideoFill, 
    BsCameraVideoOffFill, 
    BsMicFill, 
    BsMicMuteFill, 
    BsTelephoneXFill, 
    BsFullscreen, 
    BsFullscreenExit 
} from "react-icons/bs";
import { theme } from "../utils/theme";

export default function VideoCall({ socket, currentUser, currentChat, endCallParent, incomingCallData }) {
  const [stream, setStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null); // New state for remote stream
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [layoutMode, setLayoutMode] = useState("pip"); // 'pip' | 'grid'

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  
  // ICE Servers Configuration
  const peerConfig = {
      iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          { urls: 'stun:stun.services.mozilla.com' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun4.l.google.com:19302' }
      ]
  };

  useEffect(() => {
    // 1. Get User Media
    console.log("Requesting media devices...");
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        .then((currentStream) => {
            console.log("Media stream obtained");
            setStream(currentStream);
            if (myVideo.current) {
                myVideo.current.srcObject = currentStream;
            }
        })
        .catch((err) => {
            console.error("Error accessing media devices:", err);
            alert("Could not access camera/microphone. Please check permissions.");
            endCallParent();
        });

    // ... (rest of the code)
    if (incomingCallData) {
        setReceivingCall(true);
        setCaller(incomingCallData.from);
        setName(incomingCallData.name);
        setCallerSignal(incomingCallData.signal);
    }

    // Cleanup on unmount
    return () => {
        if(connectionRef.current) {
            connectionRef.current.destroy();
        }
        // Stop all tracks
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
    };
  }, []);

  // Effect to attach remote stream when video element is ready
  useEffect(() => {
      if (userVideo.current && remoteStream) {
          userVideo.current.srcObject = remoteStream;
      }
  }, [remoteStream, callAccepted]); // Run when stream arrives or UI updates to show video

  // 3. Listen for Call Accepted
  useEffect(() => {
      if(!socket.current) return;

      const handleCallAccepted = (signal) => {
          setCallAccepted(true);
          if(connectionRef.current) {
              connectionRef.current.signal(signal);
          }
      };

      const handleEndCall = () => {
          setCallEnded(true);
          cleanupCall();
      };

      socket.current.on("call-accepted", handleCallAccepted);
      socket.current.on("end-call", handleEndCall);

      return () => {
          socket.current.off("call-accepted", handleCallAccepted);
          socket.current.off("end-call", handleEndCall);
      };
  }, [socket]);


  const callUser = (id) => {
    if (!stream) {
        alert("Camera/Mic not ready yet!");
        return;
    }

    const peer = new Peer({
      initiator: true,
      trickle: false,
      config: peerConfig,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("call-user", {
        userToCall: id,
        signalData: data,
        from: currentUser._id,
        name: currentUser.username,
      });
    });

    peer.on("stream", (currentRemoteStream) => {
        setRemoteStream(currentRemoteStream); // Update state instead of ref directly
    });
    
    peer.on("error", (err) => {
        console.error("Peer error:", err);
        // Optional: Notify user of connection failure
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    if (!stream) {
        console.warn("Cannot answer: Stream not ready");
        alert("Wait for your camera to load!");
        return;
    }

    setCallAccepted(true);
    console.log("Answering call...");
    const peer = new Peer({
      initiator: false,
      trickle: false,
      config: peerConfig,
      stream: stream,
    });

    peer.on("signal", (data) => {
      console.log("Sending answer signal");
      socket.current.emit("answer-call", { signal: data, to: caller });
    });

    peer.on("stream", (currentRemoteStream) => {
        console.log("Received remote stream");
        setRemoteStream(currentRemoteStream); 
    });

    peer.on("error", (err) => {
        console.error("Peer error:", err);
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const cleanupCall = () => {
      if (connectionRef.current) {
          connectionRef.current.destroy();
      }
      endCallParent();
  };

  const leaveCall = () => {
    setCallEnded(true);
    const idToEnd = receivingCall ? caller : currentChat?._id;
    if (idToEnd) socket.current.emit("end-call", { to: idToEnd });
    cleanupCall();
  };

  const toggleMic = () => {
      if(stream) {
          const audioTrack = stream.getAudioTracks()[0];
          if(audioTrack) {
              audioTrack.enabled = !audioTrack.enabled;
              setMicMuted(!micMuted);
          }
      }
  }

  const toggleVideo = () => {
      if(stream) {
          const videoTrack = stream.getVideoTracks()[0];
          if(videoTrack) {
              videoTrack.enabled = !videoTrack.enabled;
              setVideoMuted(!videoMuted);
          }
      }
  }

  const toggleLayout = () => {
      setLayoutMode(layoutMode === "pip" ? "grid" : "pip");
  };

  return (
    <Container mode={layoutMode}>
      <div className="video-wrapper">
          {/* Remote Video */}
          <div className={`video-container remote-video ${callAccepted && !callEnded ? "active" : ""}`}>
             {callAccepted && !callEnded ? (
                <video playsInline ref={userVideo} autoPlay />
             ) : (
                 <div className="placeholder">
                     <div className="avatar-pulse">
                        {currentChat?.avatarImage ? (
                             <img src={`data:image/svg+xml;base64,${currentChat.avatarImage}`} alt="avatar" />
                        ) : (
                            <div className="avatar-initial">{currentChat?.username?.charAt(0)}</div>
                        )}
                     </div>
                     <p>{!receivingCall ? `Calling ${currentChat?.username}...` : "Connecting..."}</p>
                 </div>
             )}
          </div>

          {/* Local Video */}
          <div className="video-container local-video">
             {stream && <video playsInline muted ref={myVideo} autoPlay />}
          </div>
      </div>
      
            {/* Incoming Call Overlay */}
      {receivingCall && !callAccepted && (
        <div className="overlay incoming-call">
          <div className="glass-card">
              <h2>{name}</h2>
              <p>is calling you...</p>
              <div className="actions">
                <button 
                    className="btn-accept" 
                    onClick={answerCall}
                    disabled={!stream} 
                    style={{ opacity: !stream ? 0.5 : 1, cursor: !stream ? 'not-allowed' : 'pointer' }}
                >
                    <BsTelephoneXFill style={{transform: "rotate(135deg)"}}/> {stream ? "Accept" : "Loading Cam..."}
                </button>
                <button className="btn-reject" onClick={leaveCall}>
                    <BsTelephoneXFill /> Reject
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Start Call Overlay (Initiator) */}
      {!receivingCall && !callAccepted && (
          <div className="overlay start-call">
             <div className="glass-card">
                 <h2>Ready to call?</h2>
                 <div className="actions">
                     <button className="btn-start" onClick={() => callUser(currentChat._id)}>Start Call</button>
                     <button className="btn-cancel" onClick={leaveCall}>Cancel</button>
                 </div>
             </div>
          </div>
      )}

      {/* Controls Bar */}
      <div className="controls-bar">
          <button onClick={toggleMic} className={`control-btn ${micMuted ? "danger" : ""}`}>
              {micMuted ? <BsMicMuteFill /> : <BsMicFill />}
          </button>
          <button onClick={leaveCall} className="control-btn danger">
              <BsTelephoneXFill />
          </button>
          <button onClick={toggleVideo} className={`control-btn ${videoMuted ? "danger" : ""}`}>
              {videoMuted ? <BsCameraVideoOffFill /> : <BsCameraVideoFill />}
          </button>
          {callAccepted && (
              <button onClick={toggleLayout} className="control-btn">
                  {layoutMode === "pip" ? <BsFullscreenExit /> : <BsFullscreen />}
              </button>
          )}
      </div>
    </Container>
  );
}

const Container = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: ${theme.colors.background};
  z-index: 9999;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  video {
      background: #000;
  }

  .video-wrapper {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      
      /* Grid Mode */
      ${props => props.mode === 'grid' && `
          flex-direction: row;
          gap: 1rem;
          padding: 1rem;
          
          .video-container {
              width: 50%;
              height: 100%;
              border-radius: 1rem;
              overflow: hidden;
              box-shadow: ${theme.shadows.card};
              
              video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
          }

          @media (max-width: ${theme.breakpoints.tablet}) {
              flex-direction: column;
              .video-container {
                  width: 100%;
                  height: 50%;
              }
          }
      `}

      /* PiP Mode */
      ${props => props.mode === 'pip' && `
          .remote-video {
              width: 100%;
              height: 100%;
              
              video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }
              
              .placeholder {
                  display: flex;
                  flex-direction: column;
                  justify-content: center;
                  align-items: center;
                  height: 100%;
                  color: ${theme.colors.text};
                  gap: 1rem;
                  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);

                  .avatar-pulse {
                      width: 100px;
                      height: 100px;
                      border-radius: 50%;
                      background: ${theme.colors.primary};
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      animation: pulse 2s infinite;
                      
                      img {
                          width: 90%;
                          height: 90%;
                          border-radius: 50%;
                          object-fit: cover;
                      }
                      .avatar-initial {
                          font-size: 3rem;
                          font-weight: bold;
                          color: white;
                      }
                  }
              }
          }

          .local-video {
              position: absolute;
              bottom: 120px;
              right: 20px;
              width: 200px;
              aspect-ratio: 16/9;
              background: #333;
              border-radius: 12px;
              overflow: hidden;
              box-shadow: 0 8px 24px rgba(0,0,0,0.5);
              border: 2px solid ${theme.colors.primary};
              z-index: 10;
              transition: all 0.3s ease;
              
              video {
                  width: 100%;
                  height: 100%;
                  object-fit: cover;
              }

              &:hover {
                  transform: scale(1.05);
              }

              @media (max-width: ${theme.breakpoints.tablet}) {
                  width: 140px;
                  bottom: 100px;
                  right: 16px;
              }
          }
      `}
  }

  .controls-bar {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 1.5rem;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      padding: 1rem 2rem;
      border-radius: 50px;
      z-index: 100;
      box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.1);

      .control-btn {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          border: none;
          background: rgba(0,0,0,0.5);
          color: white;
          font-size: 1.2rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;

          &:hover {
              background: ${theme.colors.primary};
              transform: translateY(-2px);
          }

          &.danger {
              background: ${theme.colors.danger};
              &:hover { background: #cc0000; }
          }
      }
  }

  .overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0,0,0,0.6);
      backdrop-filter: blur(5px);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 50;

      .glass-card {
          background: rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(16px);
          padding: 2rem 3rem;
          border-radius: 20px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);

          h2 { margin-bottom: 0.5rem; }
          p { margin-bottom: 2rem; color: ${theme.colors.textSecondary}; }

          .actions {
              display: flex;
              gap: 1rem;
              justify-content: center;

              button {
                  padding: 0.8rem 1.5rem;
                  border-radius: 50px;
                  border: none;
                  font-weight: 600;
                  font-size: 1rem;
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  transition: transform 0.2s;

                  &:hover { transform: scale(1.05); }

                  &.btn-start, &.btn-accept {
                      background: ${theme.colors.success};
                      color: white;
                  }
                  &.btn-cancel, &.btn-reject {
                      background: ${theme.colors.danger};
                      color: white;
                  }
              }
          }
      }
  }

  @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(154, 134, 243, 0.7); }
      70% { box-shadow: 0 0 0 20px rgba(154, 134, 243, 0); }
      100% { box-shadow: 0 0 0 0 rgba(154, 134, 243, 0); }
  }
`;
