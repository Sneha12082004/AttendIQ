import React, { useEffect, useState } from 'react'
import { MapPin, Plus, Radio, Compass } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Modal } from '../../components/ui/Modal'
import { adminApi } from '../../api/admin'

export const ClassroomsPage: React.FC = () => {
  const [classrooms, setClassrooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Form fields
  const [name, setName] = useState('')
  const [building, setBuilding] = useState('')
  const [floor, setFloor] = useState(1)
  const [lat, setLat] = useState(19.0760)
  const [lon, setLon] = useState(72.8777)
  const [radius, setRadius] = useState(50)
  const [beacon, setBeacon] = useState('BEACON-CS-101')

  const fetchClassrooms = async () => {
    try {
      const data = await adminApi.getClassrooms()
      setClassrooms(data)
    } catch (err) {
      console.error('Failed to load classrooms:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClassrooms()
  }, [])

  const handleAddClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await adminApi.configureClassroom({
        name,
        building,
        floor: Number(floor),
        latitude: Number(lat),
        longitude: Number(lon),
        radius_meters: Number(radius),
        ble_beacon_id: beacon,
        capacity: 60,
      })
      setShowAddModal(false)
      fetchClassrooms()
    } catch (err) {
      alert('Failed to configure classroom')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Classroom Geofence Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Define high-precision GPS classroom centroids, allowed geofence perimeter radius, and BLE beacons
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowAddModal(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Classroom Geofence
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classrooms.map((room) => (
          <Card key={room.id} className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-teal-600" />
                {room.name}
              </span>
              <span className="text-[10px] text-teal-700 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
                Radius: {room.radius_meters}m
              </span>
            </div>

            <p className="text-xs text-slate-500">
              {room.building} • Floor {room.floor || 1} • Capacity {room.capacity || 60}
            </p>

            <div className="p-3 bg-slate-50 rounded-lg text-[11px] font-mono text-slate-700 space-y-1">
              <div>LAT: {room.latitude?.toFixed(6)}</div>
              <div>LON: {room.longitude?.toFixed(6)}</div>
              {room.ble_beacon_id && (
                <div className="text-teal-700 font-semibold flex items-center gap-1 mt-1">
                  <Radio className="w-3 h-3 text-teal-600 animate-pulse" />
                  BLE Beacon: {room.ble_beacon_id}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Register Classroom Geofence"
      >
        <form onSubmit={handleAddClassroom} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-medium mb-1">Classroom Name *</label>
            <Input
              required
              placeholder="e.g. Room 302 - Cyber Lab"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Building</label>
              <Input
                placeholder="CS Block"
                value={building}
                onChange={(e) => setBuilding(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Floor</label>
              <Input
                type="number"
                value={floor}
                onChange={(e) => setFloor(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Latitude *</label>
              <Input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">Longitude *</label>
              <Input
                type="number"
                step="0.000001"
                value={lon}
                onChange={(e) => setLon(Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Radius (Meters) *</label>
              <Input
                type="number"
                min={10}
                max={250}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-medium mb-1">BLE Beacon ID (Optional)</label>
              <Input
                placeholder="BEACON-XX-001"
                value={beacon}
                onChange={(e) => setBeacon(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save Classroom Geofence
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
