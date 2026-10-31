"use client";

import { memo } from "react";

/**
 * The approved plate, split so each part can fade on its own.
 * Back to front: moon and village, werewolf, claws, eyes.
 * Together they are the approved artwork.
 */
export const Mark = memo(function Mark() {
  return (
    <div className="opening-art" role="img" aria-label="A village inside a moon, enclosed by a werewolf">
      <img className="plate moon" src="/opening/trustless-moon-village.png" alt="" />
      <img className="plate wolf" src="/opening/trustless-werewolf.png" alt="" />
      <img className="plate claws" src="/opening/trustless-claws.png" alt="" />
      <img className="plate eyes" src="/opening/trustless-eyes.png" alt="" />
    </div>
  );
});
