import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import Peer from "simple-peer";
import { BsCameraVideoFill, BsCameraVideoOffFill, BsMicFill, BsMicMuteFill, BsTelephoneXFill } from "react-icons/bs";

export default function VideoCall({ socket, currentUser, currentChat, endCallParent, incomingCallData }) {
  const [stream, setStream] = useState();
  const [receivingCall, setReceivingCall] = useState(false);
  const [caller, setCaller] = useState("");
  const [callerSignal, setCallerSignal] = useState();
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [name, setName] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream) => {
      setStream(stream);
      if (myVideo.current) {
        myVideo.current.srcObject = stream;
      }
    });

    if (incomingCallData) {
        setReceivingCall(true);
        setCaller(incomingCallData.from);
        setName(incomingCallData.name);
        setCallerSignal(incomingCallData.signal);
    }

    socket.current.on("call-accepted", (signal) => {
        setCallAccepted(true);
        connectionRef.current.signal(signal);
    });

    socket.current.on("end-call", () => {
        setCallEnded(true);
        leaveCall();
    });
  }, []);

  const callUser = (id) => {
    const peer = new Peer({
      initiator: true,
      trickle: false,
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

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    socket.current.on("call-accepted", (signal) => {
      setCallAccepted(true);
      peer.signal(signal);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    setCallAccepted(true);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream: stream,
    });

    peer.on("signal", (data) => {
      socket.current.emit("answer-call", { signal: data, to: caller });
    });

    peer.on("stream", (stream) => {
      if (userVideo.current) {
        userVideo.current.srcObject = stream;
      }
    });

    peer.signal(callerSignal);
    connectionRef.current = peer;
  };

  const leaveCall = () => {
    setCallEnded(true);
    if (connectionRef.current) {
        connectionRef.current.destroy();
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
    const idToEnd = receivingCall ? caller : currentChat?._id;
    if (idToEnd) socket.current.emit("end-call", { to: idToEnd });
    endCallParent();
  };

  const toggleMic = () => {
      if(stream) {
          stream.getAudioTracks()[0].enabled = !stream.getAudioTracks()[0].enabled;
          setMicMuted(!micMuted);
      }
  }

  const toggleVideo = () => {
      if(stream) {
          stream.getVideoTracks()[0].enabled = !stream.getVideoTracks()[0].enabled;
          setVideoMuted(!videoMuted);
      }
  }

  // Auto call if we are the initiator (not receiving call)
  useEffect(() => {
      if (!receivingCall && stream && currentChat) {
          // Check if we should call? 
          // Actually this component is mounted when user clicks video button.
          // So yes, initiate call.
          // But wait, if we are receiving call, we shouldn't initiate.
          // We need a prop to know if we are initiator or receiver.
          // Or we just handle 'callUser' call manually from a button, but UI expects immediate feedback.
          // Let's assume mounting this component means we are in "Call Mode".
          // If receivingCall is false, we start calling.
          // BUT, socket listener for "call-user" is inside useEffect.
          // We might have received the event BEFORE mounting this component? 
          // No, the event listener is in ChatContainer mostly?
          // Actually, better logic: 
          // ChatContainer listens for "call-user". If received, it mounts VideoCall with `receivingCall=true`.
          // If user clicks "Video Call" button, it mounts VideoCall with `receivingCall=false`.
      }
  }, [stream]);

  // We need to trigger callUser manually if we are the one starting.
  // Let's use a "Start Call" button or auto-start.
  // Auto-start is better UX for "I clicked Video Call".
  useEffect(() => {
      if(stream && !receivingCall && !callAccepted && !callEnded) {
          // Only call if we are not answering
          // And we haven't called yet.
          // callUser(currentChat._id);
          // But this might run multiple times.
          // Let's keep it manual or controlled by parent.
      }
  }, [stream]);

  return (
    <Container>
      <div className="video-container">
        <div className="video">
          {stream && <video playsInline muted ref={myVideo} autoPlay />}
        </div>
        <div className="video">
          {callAccepted && !callEnded ? (
            <video playsInline ref={userVideo} autoPlay />
          ) : (
             !receivingCall && <div className="calling-info">Calling {currentChat.username}...</div>
          )}
        </div>
      </div>
      
      <div className="controls">
          <button onClick={toggleMic}>
              {micMuted ? <BsMicMuteFill /> : <BsMicFill />}
          </button>
          <button onClick={toggleVideo}>
              {videoMuted ? <BsCameraVideoOffFill /> : <BsCameraVideoFill />}
          </button>
          <button className="end-call" onClick={leaveCall}>
              <BsTelephoneXFill />
          </button>
      </div>

      {receivingCall && !callAccepted && (
        <div className="caller">
          <h1>{name} is calling...</h1>
          <button onClick={answerCall}>Answer</button>
        </div>
      )}
      {!receivingCall && !callAccepted && (
          <div className="caller">
             <button onClick={() => callUser(currentChat._id)}>Start Call</button>
          </div>
      )}
    </Container>
  );
}

const Container = styled.div`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0,0,0,0.9);
    z-index: 9999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .video-container {
        display: flex;
        justify-content: center;
        gap: 2rem;
        flex-wrap: wrap;
        .video {
            width: 400px;
            height: 300px;
            border: 2px solid #4e0eff;
            background: black;
            video {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }
            .calling-info {
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100%;
            }
        }
    }

    .controls {
        margin-top: 2rem;
        display: flex;
        gap: 1rem;
        button {
            background-color: #4e0eff;
            color: white;
            padding: 1rem;
            border-radius: 50%;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            &:hover {
                background-color: #997af0;
            }
            &.end-call {
                background-color: #ff0000;
                &:hover {
                    background-color: #ff4d4d;
                }
            }
        }
    }

    .caller {
        margin-top: 2rem;
        text-align: center;
        color: white;
        h1 {
            margin-bottom: 1rem;
        }
        button {
            background-color: #00ff00;
            color: black;
            padding: 0.5rem 2rem;
            border: none;
            font-size: 1.2rem;
            cursor: pointer;
            border-radius: 0.5rem;
        }
    }
`;
