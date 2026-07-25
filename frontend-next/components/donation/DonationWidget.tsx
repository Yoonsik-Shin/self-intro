'use client';

import { useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart } from 'lucide-react';
import { donationApi } from '@/lib/api';
import { DonationModal } from './DonationModal';

export function DonationWidget() {
    const [isDonationOpen, setDonationOpen] = useState(false);
    const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

    const isDraggingRef = useRef(false);
    const dragStartRef = useRef<{ mouseX: number; mouseY: number; elemX: number; elemY: number }>({
        mouseX: 0,
        mouseY: 0,
        elemX: 0,
        elemY: 0,
    });
    const hasDraggedRef = useRef(false);

    const [isPreviewMode] = useState(() => {
        if (typeof window !== 'undefined') {
            return new URLSearchParams(window.location.search).get('preview') === '1';
        }
        return false;
    });

    const { data: donationConfig } = useQuery({
        queryKey: ['donationConfig'],
        queryFn: donationApi.config,
        enabled: !isPreviewMode,
    });
    const isDonationEnabled = donationConfig?.enabled === true;

    const handlePointerDown = (clientX: number, clientY: number, target: HTMLElement) => {
        isDraggingRef.current = true;
        hasDraggedRef.current = false;
        const rect = target.getBoundingClientRect();
        dragStartRef.current = {
            mouseX: clientX,
            mouseY: clientY,
            elemX: rect.left,
            elemY: rect.top,
        };
    };

    const handlePointerMove = (clientX: number, clientY: number) => {
        if (!isDraggingRef.current) return;
        const deltaX = clientX - dragStartRef.current.mouseX;
        const deltaY = clientY - dragStartRef.current.mouseY;

        if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
            hasDraggedRef.current = true;
        }

        const newX = Math.max(
            10,
            Math.min(window.innerWidth - 60, dragStartRef.current.elemX + deltaX)
        );
        const newY = Math.max(
            10,
            Math.min(window.innerHeight - 60, dragStartRef.current.elemY + deltaY)
        );

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
        isDraggingRef.current = false;
    };

    useEffect(() => {
        const onMouseMove = (e: MouseEvent) => handlePointerMove(e.clientX, e.clientY);
        const onMouseUp = () => handlePointerUp();
        const onTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                handlePointerMove(e.touches[0].clientX, e.touches[0].clientY);
            }
        };
        const onTouchEnd = () => handlePointerUp();

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        window.addEventListener('touchmove', onTouchMove);
        window.addEventListener('touchend', onTouchEnd);

        return () => {
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('touchend', onTouchEnd);
        };
    }, []);

    if (!isDonationEnabled) return null;

    return (
        <>
            <button
                type="button"
                onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY, e.currentTarget)}
                onTouchStart={(e) =>
                    handlePointerDown(e.touches[0].clientX, e.touches[0].clientY, e.currentTarget)
                }
                onClick={() => {
                    if (!hasDraggedRef.current) {
                        setDonationOpen(true);
                    }
                }}
                style={
                    position
                        ? {
                              left: `${position.x}px`,
                              top: `${position.y}px`,
                              bottom: 'auto',
                              right: 'auto',
                          }
                        : undefined
                }
                className={`fixed z-50 flex h-12 w-12 cursor-grab active:cursor-grabbing items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-transform duration-100 hover:scale-110 hover:bg-blue-700 active:scale-95 print:hidden ${
                    position ? '' : 'bottom-6 right-6'
                }`}
                title="후원하기 (드래그하여 원하는 위치로 이동 가능)"
                aria-label="후원하기"
            >
                <Heart className="h-5 w-5 fill-white text-white" />
            </button>
            {isDonationOpen && <DonationModal onClose={() => setDonationOpen(false)} />}
        </>
    );
}
