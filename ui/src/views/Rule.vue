<template>
  <div>
    <h1>Mahjong Rules</h1>
    <h2>Suits: </h2>
    <ul>
      <li>Bamboo(条), Rank: 1-9;</li>
      <li>Dot(筒), Rank: 1-9;</li>
      <li>Character(万), Rank: 1-9;</li>
      <li>Dragon(箭牌), Rank: Red Dragon, Green Dragon, White Dragon;</li>
      <li>Wind(风牌), Rank: North Wind, South Wind, East Wind, West Wind;</li>
      <li>Bonus(花牌), Rank: Flower, Season;</li>
    </ul>
    <p>Each Rank has 4 tiles, with a total of 144 tiles.</p>

    <h2>Dealer:</h2>
    <p>The player who has the first turn of playing in this Mahjong game(庄家). The Dealer initially gets 14 tiles while other players get 13 tiles. In the first turn, Dealer discards a tile and does not draw any tile. After this, the players can take turns to draw a tile and discard a tile, or perform melds like pong, kong, or chow.</p>

    <h2>Melds:</h2>
    Melds are groups of specific combinations of tiles. The objective of Mahjong is to collect tiles in melds, which is similar to poker. The player wins by collecting certain patterns of melds. There are three melds in our game: pong, kong, and chow.
    <ul>
      <li>
        <b>pong(碰): </b> Pong is the action that a player takes a tile discarded by anyone, in order to make a set of three tiles of the same rank and same suit. e.g. AAA
      </li>
      <li>
        <b>kong(杠): </b> Similar to pong, Kong is the action that a player takes a tile discarded by anyone, in order to make a set of four tiles of the same rank and same suit. e.g. AAAA
      </li>
      <li>
        <b>chow(吃): </b> Chow is the action that a player takes the tile discarded by the person immediately before, in order to make a set of three tiles of the same suit in consecutive rank. e.g. ABC
      </li>
    </ul>
    
    <h2>Win:</h2>
    <p>A winning hand(胡) must consist of four melds (pongs, kongs, or chows) and a pair(two identical tiles). e.g. AA ABC ABC, ABC, AA AAA ABC ABC, AA AAA AAA ABC, AA AAA AAA AAA</p>
    <h2>Ready Hand:</h2>
    <p>When a hand is one tile short of winning, the hand is said to be a ready hand(听牌). The player holding a ready hand is said to be waiting for certain tiles. There are two ways a player can obtain the one last piece of winning tile: draw the needed tile to win by the player in the player’s own round, or take the needed tile discarded by anyone. For example, a player can chow anyone’s tile instead of the person immediately before when the player is at ready hand.</p>

    <h2>Game Flow:</h2>
    <ol>
      <li>Set configuration: Set the dealer and order of playing(clockwise or counterclockwise) in the configuration page.</li>
      <li>When a game starts, Dealer gets 14 tiles and other players get 13 tiles.</li>
      <li>If any player gets a bonus tile, exchange the bonus tile for another tile.</li>
      <li>In the first turn, Dealer discards a tile and does not draw any tile. After this, the players can take turns to draw a tile and discard a tile, or perform melds like pong, kong, or chow. If a meld is performed, the player needs to discard a tile to keep the number of tiles at hand 13. </li>
      <li>The first player who wins actually wins the game.</li>
    </ol>
  </div>
</template>