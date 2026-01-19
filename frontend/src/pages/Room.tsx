import React, { useEffect, useCallback, useState } from "react";
import ReactPlayer from "react-player";
import peer from "../service/peer";
import { useSocket } from "../context/SocketProvider";

const RoomPage = () => {
  const socket = useSocket() as import("socket.io-client").Socket | null;

  const [remoteSocketId, setRemoteSocketId] = useState<string | null>(null);
  const [myStream, setMyStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const addTracksOnce = useCallback((stream: MediaStream) => {
    const senders = peer.peer.getSenders();

    stream.getTracks().forEach((track) => {
      const alreadyAdded = senders.find(
        (sender: RTCRtpSender) => sender.track === track,
      );

      if (!alreadyAdded) {
        peer.peer.addTrack(track, stream);
      }
    });
  }, []);

  const handleUserJoined = useCallback(
    ({ id }: { email: string; id: string }) => {
      setRemoteSocketId(id);
    },
    [],
  );

  const handleCallUser = useCallback(async () => {
    if (!socket || !remoteSocketId) return;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    setMyStream(stream);
    addTracksOnce(stream);

    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
  }, [socket, remoteSocketId, addTracksOnce]);

  const handleIncomingCall = useCallback(
    async ({ from, offer }: { from: string; offer: any }) => {
      setRemoteSocketId(from);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });

      setMyStream(stream);
      addTracksOnce(stream);

      const ans = await peer.getAnswer(offer);
      socket?.emit("call:accepted", { to: from, ans });
    },
    [socket, addTracksOnce],
  );

  const handleCallAccepted = useCallback(
    async ({ ans }: { from: string; ans: any }) => {
      await peer.setLocalDescription(ans);
    },
    [],
  );


  const handleNegotiationNeeded = useCallback(async () => {
    if (!socket || !remoteSocketId) return;

    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { to: remoteSocketId, offer });
  }, [socket, remoteSocketId]);

  const handleNegoIncoming = useCallback(
    async ({ from, offer }: { from: string; offer: any }) => {
      const ans = await peer.getAnswer(offer);
      socket?.emit("peer:nego:done", { to: from, ans });
    },
    [socket],
  );

  const handleNegoFinal = useCallback(async ({ ans }: { ans: any }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    peer.peer.ontrack = (event) => {
      setRemoteStream(event.streams[0]);
    };
  }, []);


  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegotiationNeeded);
    return () => {
      peer.peer.removeEventListener(
        "negotiationneeded",
        handleNegotiationNeeded,
      );
    };
  }, [handleNegotiationNeeded]);

  useEffect(() => {
    if (!socket) return;

    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoIncoming);
    socket.on("peer:nego:final", handleNegoFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoIncoming);
      socket.off("peer:nego:final", handleNegoFinal);
    };
  }, [
    socket,
    handleUserJoined,
    handleIncomingCall,
    handleCallAccepted,
    handleNegoIncoming,
    handleNegoFinal,
  ]);

  return (
    <div>
      <h1>Room Page</h1>
      <h4>{remoteSocketId ? "Connected" : "No one in room"}</h4>

      {remoteSocketId && <button onClick={handleCallUser}>CALL</button>}

      {myStream && (
        <>
          <h3>My Stream</h3>
          <ReactPlayer
            playing
            muted
            height="120px"
            width="200px"
            url={myStream}
          />
        </>
      )}

      {remoteStream && (
        <>
          <h3>Remote Stream</h3>
          <ReactPlayer
            playing
            height="120px"
            width="200px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  );
};

export default RoomPage;
