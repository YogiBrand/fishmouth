import React, { useState } from 'react';
import { Flame, MapPin, TrendingUp, Calendar } from 'lucide-react';

export default function ContagionHeatmap({ clusters = [] }) {
  const [selectedCluster, setSelectedCluster] = useState(null);

  return (
    <div className="h-[420px] px-6 pb-6">
      <div className="rounded-2xl overflow-hidden border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-800 p-6">
        <div className="h-full relative">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold flex items-center">
              <Flame className="w-5 h-5 mr-2 text-red-400" />
              Permit Clusters
            </h3>
            <span className="text-slate-400 text-sm">{clusters.length} active areas</span>
          </div>

          {/* Cluster Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-[300px] overflow-y-auto">
            {clusters.map((cluster, index) => (
              <div
                key={cluster.id || index}
                className={`bg-slate-800/50 rounded-lg p-4 border border-slate-700 hover:border-red-400/50 cursor-pointer transition-all ${
                  selectedCluster?.id === cluster.id ? 'border-red-400 bg-red-900/20' : ''
                }`}
                onClick={() => setSelectedCluster(cluster)}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center text-white font-medium mb-1">
                      <MapPin className="w-4 h-4 mr-2 text-red-400" />
                      {cluster.city || 'Unknown City'}, {cluster.state || 'Unknown State'}
                    </div>
                    <p className="text-slate-400 text-sm">
                      {cluster.permit_count || 0} permits in {Number(cluster.radius_miles || 0).toFixed(1)} mi radius
                    </p>
                  </div>
                  <div className="flex items-center justify-center rounded-full bg-red-500/90 w-10 h-10 border border-red-400/30">
                    <span className="text-white font-semibold text-sm">{cluster.permit_count || 0}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-slate-400">Cluster Score</dt>
                    <dd className="text-white font-semibold">{cluster.cluster_score || 'N/A'}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Status</dt>
                    <dd className={`font-semibold capitalize ${
                      cluster.cluster_status === 'active' ? 'text-green-400' :
                      cluster.cluster_status === 'hot' ? 'text-red-400' : 'text-yellow-400'
                    }`}>
                      {cluster.cluster_status || 'unknown'}
                    </dd>
                  </div>
                </div>

                {cluster.date_range_start && cluster.date_range_end && (
                  <div className="mt-3 pt-3 border-t border-slate-700">
                    <div className="flex items-center text-slate-400 text-xs">
                      <Calendar className="w-3 h-3 mr-1" />
                      {cluster.date_range_start} → {cluster.date_range_end}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Empty State */}
          {clusters.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <Flame className="w-12 h-12 mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No Active Clusters</p>
              <p className="text-sm text-center max-w-xs">
                Permit clusters will appear here when high-density construction activity is detected in your area.
              </p>
            </div>
          )}

          {/* Selected Cluster Details */}
          {selectedCluster && (
            <div className="absolute bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 p-4 rounded-t-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-medium flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2 text-red-400" />
                  Detailed Analysis
                </h4>
                <button
                  onClick={() => setSelectedCluster(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Close
                </button>
              </div>
              <p className="text-slate-300 text-sm">
                This cluster shows significant construction activity with {selectedCluster.permit_count} permits. 
                Monitor this area for potential lead generation opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
