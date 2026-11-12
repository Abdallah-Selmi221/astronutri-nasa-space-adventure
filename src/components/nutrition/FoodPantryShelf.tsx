import React from 'react';
import { FOOD_DATABASE } from '../../data/foodItems';
import { FoodItem } from '../../types/game';
import { DraggableFoodItem } from './DraggableFoodItem';

interface FoodPantryShelfProps {
  onDropInCargo: (item: FoodItem) => void;
  onBannedAttempt: (item: FoodItem) => void;
  cargoBoxRectRef: React.RefObject<HTMLDivElement | null>;
}

export const FoodPantryShelf: React.FC<FoodPantryShelfProps> = ({
  onDropInCargo,
  onBannedAttempt,
  cargoBoxRectRef
}) => {
  return (
    <div className="w-full bg-gradient-to-b from-white/85 via-sky-50/85 to-cyan-100/80 border-4 border-sky-300 rounded-[2.5rem] p-4 sm:p-6 backdrop-blur-xl shadow-[0_16px_45px_rgba(14,165,233,0.28)]">
      {/* Responsive Grid of Large, White, Glossy, Rounded Food Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3.5 sm:gap-4">
        {FOOD_DATABASE.map((item) => (
          <DraggableFoodItem
            key={item.id}
            item={item}
            onDropInCargo={onDropInCargo}
            onBannedAttempt={onBannedAttempt}
            cargoBoxRectRef={cargoBoxRectRef}
          />
        ))}
      </div>
    </div>
  );
};
