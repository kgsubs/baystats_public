import React from 'react';
import { VesselCountForm } from '../components/admin/VesselCountForm';

export const AdminVessels: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <VesselCountForm />
    </div>
  );
};

export default AdminVessels;
