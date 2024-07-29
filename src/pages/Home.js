import React from "react";
import MainApp from "../components/MainApp";
import WelcomeScreen from "../components/WelcomeScreen";

function Home({ handleLogin, handleGetStarted, isWelcomeScreenVisible, data, handleAddNode }) {
  return (
    <div className="home">
      {isWelcomeScreenVisible ? (
        <WelcomeScreen handleLogin={handleLogin} handleGetStarted={handleGetStarted} />
      ) : (
        <MainApp data={data} handleAddNode={handleAddNode} />
      )}
    </div>
  );
}

export default Home;
