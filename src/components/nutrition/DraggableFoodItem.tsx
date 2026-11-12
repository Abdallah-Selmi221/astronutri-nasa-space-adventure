import React, { useRef } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { FoodItem } from '../../types/game';
import { Check, X } from 'lucide-react';

interface DraggableFoodItemProps {
  item: FoodItem;
  onDropInCargo: (item: FoodItem) => void;
  onBannedAttempt: (item: FoodItem) => void;
  cargoBoxRectRef: React.RefObject<HTMLDivElement | null>;
}

export const DraggableFoodItem: React.FC<DraggableFoodItemProps> = ({
  item,
  onDropInCargo,
  onBannedAttempt,
  cargoBoxRectRef
}) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const handleDragStart = () => {
    isDraggingRef.current = true;
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setTimeout(() => {
      isDraggingRef.current = false;
    }, 80);

    if (cargoBoxRectRef.current) {
      const boxRect = cargoBoxRectRef.current.getBoundingClientRect();
      const pad = 50;
      const dropX = info.point.x;
      const dropY = info.point.y;

      let isInsideCargoBox =
        dropX >= boxRect.left - pad &&
        dropX <= boxRect.right + pad &&
        dropY >= boxRect.top - pad &&
        dropY <= boxRect.bottom + pad;

      if (!isInsideCargoBox && itemRef.current) {
        const cardRect = itemRef.current.getBoundingClientRect();
        const overlapsHorizontally =
          cardRect.right >= boxRect.left - pad && cardRect.left <= boxRect.right + pad;
        const overlapsVertically =
          cardRect.bottom >= boxRect.top - pad && cardRect.top <= boxRect.bottom + pad;
        isInsideCargoBox = overlapsHorizontally && overlapsVertically;
      }

      if (isInsideCargoBox) {
        if (item.isBanned) {
          onBannedAttempt(item);
        } else {
          onDropInCargo(item);
        }
      }
    }
  };

  const handleCardTap = () => {
    if (isDraggingRef.current) return;
    if (item.isBanned) {
      onBannedAttempt(item);
    } else {
      onDropInCargo(item);
    }
  };

  return (
    <motion.div
      ref={itemRef}
      drag
      dragSnapToOrigin={true}
      dragElastic={0.85}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleCardTap}
      whileDrag={{
        scale: 1.15,
        zIndex: 60,
        rotate: item.isBanned ? -4 : 4,
        boxShadow: item.isBanned
          ? '0 20px 45px rgba(239, 68, 68, 0.55)'
          : '0 20px 45px rgba(16, 185, 129, 0.55)'
      }}
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.96 }}
      className={`relative group touch-none select-none cursor-grab active:cursor-grabbing rounded-3xl p-2.5 sm:p-3.5 flex flex-col items-center justify-between bg-white border-4 transition-all ${
        item.isBanned
          ? 'border-sky-300 hover:border-rose-400 shadow-[0_8px_24px_rgba(14,165,233,0.28)]'
          : 'border-sky-300 hover:border-emerald-400 shadow-[0_8px_24px_rgba(14,165,233,0.28)]'
      }`}
    >
      {/* Isolated 3D Food Sprite */}
      <div className="relative w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center bg-white rounded-2xl overflow-hidden">
        {item.svgAsset ? (
          <img
            src={item.svgAsset}
            alt={item.nameAr || item.name}
            draggable={false}
            className="w-full h-full object-contain pointer-events-none group-hover:scale-105 transition-transform"
          />
        ) : (
          <span className="text-4xl sm:text-5xl">{item.icon}</span>
        )}

        {/* Corner Status Badge: Green [✓] or Red [X] */}
        <div
          className={`absolute bottom-0.5 right-0.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-white flex items-center justify-center shadow-md ${
            item.isBanned
              ? 'bg-gradient-to-b from-red-400 to-rose-600 text-white'
              : 'bg-gradient-to-b from-emerald-400 to-green-600 text-white'
          }`}
        >
          {item.isBanned ? (
            <X className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5]" />
          ) : (
            <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5]" />
          )}
        </div>
      </div>

      {/* Arabic Food Name */}
      <span className="font-hud font-black text-xs sm:text-base text-slate-900 text-center mt-1.5">
        {item.nameAr || item.name}
      </span>
    </motion.div>
  );
};
