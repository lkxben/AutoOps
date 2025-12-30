"use client";

import React from "react";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md relative">
                <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-black"
                >
                ✕
                </button>

                {children}
            </div>
        </div>
    );
}