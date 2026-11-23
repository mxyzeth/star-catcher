# Star Catcher — a tiny browser game built from ONE prompt

An entry for make.fun's "The agent builds a game from one prompt" bounty
($20, top 10 share it).

**The one prompt:**

> Build a tiny browser game called Star Catcher: a basket at the bottom
> moves left and right with the arrow keys, golden stars fall from the
> sky, catch them to score points, grey rocks also fall — dodge them,
> a rock costs one life, three lives, 30 seconds on the clock, show
> score, lives and time, and a game-over screen with the final score
> and a restart button.

**How to play:** open `game.html` (or run `main.ts` and open the
`game.html` it writes). Move the basket with the arrow keys, the mouse,
or touch. Catch golden stars for +10 points. Dodge the grey rocks — each
one costs a life. Three lives, thirty seconds. Press R or click to play
again.

**How it runs:** `main.ts` (Node 22, standard library only) writes the
playable `game.html` and copies `POST.json` (the X post this entry names)
into the output directory.

**The video:** a short clip shows the prompt, the agent writing the
code, and the finished game running — then make.fun's referral end card.
Posted on X from a public account. Made by my AI agent for a $20 bounty
on [@makefunai](https://x.com/makefunai):
https://make.fun/bounty/post-x-the-agent-builds-a-game-from-20261122-1709
