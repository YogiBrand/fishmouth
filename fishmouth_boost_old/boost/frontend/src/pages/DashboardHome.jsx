import React from 'react';
export default function DashboardHome() {
  return (
    <div className="p-6 space-y-6">
      <section className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {['HOT Leads (7d)','WARM Leads (7d)','Reports Sent','Report Views','Replies/Clicks','Appointments']
          .map((label,i)=>(
            <div key={i} className="rounded-lg border p-4">
              <div className="text-sm text-gray-500">{label}</div>
              <div className="text-2xl font-semibold">--</div>
            </div>
        ))}
      </section>
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Lead Queue</h2>
          <div className="space-x-2">
            <button className="btn">New Scan</button>
            <button className="btn">Generate Report</button>
          </div>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Address</th>
                <th className="p-2 text-left">Owner</th>
                <th className="p-2 text-left">Contacts</th>
                <th className="p-2 text-left">Roof Age</th>
                <th className="p-2 text-left">Priority</th>
                <th className="p-2 text-left">Confidence</th>
                <th className="p-2 text-left">Reason</th>
                <th className="p-2 text-left">Last Activity</th>
                <th className="p-2 text-left">Next Step</th>
                <th className="p-2 text-left"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2">123 Main St</td>
                <td className="p-2">Jane Doe</td>
                <td className="p-2"><span className="px-2 py-1 text-xs bg-green-100 rounded">phone ✓</span></td>
                <td className="p-2">18y</td>
                <td className="p-2 font-semibold">88 (HOT)</td>
                <td className="p-2">High</td>
                <td className="p-2">Age, Granule loss</td>
                <td className="p-2">1h ago</td>
                <td className="p-2">Call</td>
                <td className="p-2">
                  <button className="btn-sm">Call</button>
                  <button className="btn-sm">SMS</button>
                  <button className="btn-sm">Report</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
