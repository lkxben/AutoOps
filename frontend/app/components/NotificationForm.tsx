"use client"
import { useState, useEffect } from "react"
import Modal from "@/app/components/Modal"
import { apiGet, apiPost, apiPut, apiDelete } from "../lib/api"
import { Trash2 } from "lucide-react";

interface NotificationFormProps {
    isOpen: boolean
    onClose: () => void
}

interface Channel {
    channel: string
    address: string
    exists: boolean
}

export default function NotificationForm({ isOpen, onClose }: NotificationFormProps) {
    const [channels, setChannels] = useState<Channel[]>([{ channel: "telegram", address: "", exists: false }])
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState("")
    const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

    useEffect(() => {
        if (!isOpen) {
            setMessage("")
            setLoading(false)
        }
    }, [isOpen])

    useEffect(() => {
        if (!isOpen) return

        const fetchChannels = async () => {
            try {
                const data = await apiGet("/notifications/channels")
                setChannels((prev) =>
                prev.map((c) => {
                    const existing = data.find((d: any) => d.channel === c.channel)
                    return existing
                    ? { ...c, address: existing.address, exists: true }
                    : { ...c, address: "", exists: false }
                })
                )
            } catch (err) {
                console.error("Failed to load channels", err)
            }
        }

        fetchChannels()
    }, [isOpen])

    const handleChange = (index: number, value: string) => {
        setChannels((prev) => {
            const copy = [...prev]
            copy[index].address = value
            return copy
        })
    }

    const handleDelete = async (index: number) => {
        const ch = channels[index]
        if (!ch.exists) {
            setChannels((prev) =>
                prev.map((c, i) => (i === index ? { ...c, address: "", exists: false } : c))
            )
            return
        }

        try {
            await apiDelete(`/notifications/channels/${ch.channel}`)
            setChannels((prev) =>
                prev.map((c, i) => (i === index ? { ...c, address: "", exists: false } : c))
            )
            setMessage(`${ch.channel} deleted successfully!`)
        } catch (err) {
            console.error(err)
            setMessage(`Error deleting ${ch.channel}`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setMessage("")

        try {
            const updated = await Promise.all(
                channels.map(async (ch) => {
                if (!ch.address) return { ...ch, exists: false }

                if (ch.exists) {
                    await apiPut(`/notifications/channels/${ch.channel}`, { address: ch.address })
                } else {
                    await apiPost("/notifications/channels", { channel: ch.channel, address: ch.address })
                }

                return { ...ch, exists: true }
                })
            )
            setChannels(updated)
            setMessage("Notifications saved successfully!")
        } catch (err) {
            console.error(err)
            setMessage("Error saving notifications")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <h2 className="text-xl font-bold mb-4">Notification Settings</h2>
            {message && (
                <p className={`mb-2 ${message.includes("success") ? "text-green-600" : "text-red-600"}`}>
                {message}
                </p>
            )}
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {channels.map((ch, index) => (
                    <div key={ch.channel} className="flex flex-col gap-1">
                        <label className="text-gray-700">
                            {capitalise(ch.channel)}
                        </label>

                        <div className="flex items-center gap-2">
                            <input
                            type="text"
                            value={ch.address}
                            onChange={(e) => handleChange(index, e.target.value)}
                            placeholder={`Enter ${ch.channel} ID`}
                            className="flex-1 border rounded px-3 py-2"
                            />

                            {ch.exists && (
                            <button
                                type="button"
                                onClick={() => handleDelete(index)}
                                className="p-2 rounded hover:bg-red-50 text-red-600 hover:text-red-700"
                                aria-label="Delete"
                            >
                                <Trash2 size={18} />
                            </button>
                            )}
                        </div>
                    </div>
                ))}
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-sky-500 text-white px-4 py-2 rounded hover:bg-sky-600 transition"
                >
                    {loading ? "Saving..." : "Save"}
                </button>
            </form>
        </Modal>
    )
}