import React, { useState } from "react";
import axios from "axios";
import "./Standings.css";

// Import local logos for header visibility
import PremierLeagueLogo from "../../assets/premier-league.png";
import Ligue1Logo from "../../assets/ligue-1.png";

const leagues = [
  { id: 2021, name: "Premier League", logo: PremierLeagueLogo, headerLogo: PremierLeagueLogo },
  { id: 2014, name: "La Liga", logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/1280px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png", headerLogo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/LaLiga_EA_Sports_2023_Vertical_Logo.svg/1280px-LaLiga_EA_Sports_2023_Vertical_Logo.svg.png" },
  { id: 2002, name: "Bundesliga", logo: "https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg", headerLogo: "https://upload.wikimedia.org/wikipedia/en/d/df/Bundesliga_logo_%282017%29.svg" },
  { id: 2015, name: "Ligue 1", logo: Ligue1Logo, headerLogo: Ligue1Logo },
  { id: 2019, name: "Serie A", logo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1pmHGka453VFWxuaH2VZ8zE0_IN83JKkyeXevykISJqTvTCRs4KUNUR1e6pS5nckPHUY&usqp=CAU", headerLogo: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcS1pmHGka453VFWxuaH2VZ8zE0_IN83JKkyeXevykISJqTvTCRs4KUNUR1e6pS5nckPHUY&usqp=CAU" },
];

// League Buttons Component
const LeagueButtons = ({ onSelectLeague }) => (
  <div className="league-buttons">
    {leagues.map((league) => (
      <button key={league.id} onClick={() => onSelectLeague(league)}>
        <img src={league.logo} alt={league.name} className="league-logo" />
        {league.name}
      </button>
    ))}
  </div>
);

// League Header Component
const LeagueHeader = ({ selectedLeague }) => (
  selectedLeague && (
    <div className="league-header">
      <img src={selectedLeague.headerLogo} alt={selectedLeague.name} className="league-header-logo" />
      <h1 className="league-header-title">{selectedLeague.name}</h1>
    </div>
  )
);

// Standings Table Component
const StandingsTable = ({ standings }) => (
  standings && (
    <div className="table-container">
      <table className="standings-table">
        <thead>
          <tr>
            <th>Pos</th>
            <th></th>
            <th>Team</th>
            <th>MP</th>
            <th>W</th>
            <th>D</th>
            <th>L</th>
            <th>GD</th>
            <th>PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((team) => (
            <tr key={team.team.id}>
              <td className="position">{team.position}</td>
              <td className="bullet-column">
                <span className="bullet"></span>
              </td>
              <td>
                <div className="team-info">
                  <img src={team.team.crest} alt={team.team.name} className="team-logo" />
                  <span>{team.team.name}</span>
                </div>
              </td>
              <td>{team.playedGames}</td>
              <td>{team.won}</td>
              <td>{team.draw}</td>
              <td>{team.lost}</td>
              <td>{team.goalDifference}</td>
              <td className="points">{team.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
);

// Main League Standings Component
const LeagueStandings = () => {
  const [standings, setStandings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedLeague, setSelectedLeague] = useState(null);

  const fetchStandings = async (league) => {
    setLoading(true);
    setError("");
    setSelectedLeague(league);

    try {
      const response = await axios.get(`http://localhost:5000/api/standings/${league.id}`);
      setStandings(response.data);
    } catch (err) {
      console.error("API Error:", err.response || err.message);
      setError("Failed to fetch standings.");
    }
    setLoading(false);
  };

  return (
    <div className="standings-container">
      <div className="table-wrapper">
        {/* League Buttons */}
        <LeagueButtons onSelectLeague={fetchStandings} />
  
        {/* League Header */}
        <LeagueHeader selectedLeague={selectedLeague} />
  
        {/* Loading/Error/Empty Messages */}
        {loading && <p>Loading standings...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        {!loading && standings && standings.length === 0 && (
          <p>No standings available</p>
        )}
  
        {/* Standings Table */}
        <StandingsTable standings={standings} />
      </div>
    </div>
  );
  
};

export default LeagueStandings;