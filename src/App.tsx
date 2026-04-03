import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { MusicPlayer } from "@/components/MusicPlayer";
import { DisclaimerModal } from "@/components/DisclaimerModal";

function App() {
  const [disclaimerConfirmed, setDisclaimerConfirmed] = useState(false);

  return (
    <>
      {!disclaimerConfirmed && (
        <DisclaimerModal onConfirm={() => setDisclaimerConfirmed(true)} />
      )}
      <MusicPlayer />
      <Toaster />
    </>
  );
}

export default App;
