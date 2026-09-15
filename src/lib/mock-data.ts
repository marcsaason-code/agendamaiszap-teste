export interface Service {
  id: string;
  name: string;
  duration: number;
  price?: number;
  category?: string;
}

export interface Appointment {
  id: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'cancelled';
}

export const mockServices: Service[] = [
  { id: '1', name: 'Corte Masculino', duration: 30, price: 35, category: 'Cabelo' },
  { id: '2', name: 'Barba', duration: 20, price: 25, category: 'Barba' },
  { id: '3', name: 'Corte + Barba', duration: 45, price: 55, category: 'Combo' },
  { id: '4', name: 'Sobrancelha', duration: 15, price: 15, category: 'Estética' },
  { id: '5', name: 'Corte Feminino', duration: 50, price: 60, category: 'Cabelo' },
  { id: '6', name: 'Escova Progressiva', duration: 120, price: 150, category: 'Cabelo' },
  { id: '7', name: 'Manicure', duration: 40, price: 35, category: 'Unhas' },
  { id: '8', name: 'Pedicure', duration: 45, price: 40, category: 'Unhas' },
  { id: '9', name: 'Design de Sobrancelha', duration: 30, price: 30, category: 'Estética' },
  { id: '10', name: 'Limpeza de Pele', duration: 60, price: 80, category: 'Estética' },
];

export const mockAppointments: Appointment[] = [
  { id: '1', clientName: 'João Silva', serviceId: '1', serviceName: 'Corte Masculino', date: '2026-03-12', time: '09:00', status: 'confirmed' },
  { id: '2', clientName: 'Carlos Souza', serviceId: '3', serviceName: 'Corte + Barba', date: '2026-03-12', time: '10:00', status: 'confirmed' },
  { id: '3', clientName: 'Maria Lima', serviceId: '5', serviceName: 'Corte Feminino', date: '2026-03-12', time: '11:00', status: 'confirmed' },
  { id: '4', clientName: 'Ana Alves', serviceId: '7', serviceName: 'Manicure', date: '2026-03-12', time: '14:00', status: 'confirmed' },
  { id: '5', clientName: 'Fernanda Santos', serviceId: '10', serviceName: 'Limpeza de Pele', date: '2026-03-12', time: '15:00', status: 'cancelled' },
  { id: '6', clientName: 'André Costa', serviceId: '3', serviceName: 'Corte + Barba', date: '2026-03-13', time: '09:00', status: 'confirmed' },
  { id: '7', clientName: 'Juliana Ferreira', serviceId: '6', serviceName: 'Escova Progressiva', date: '2026-03-13', time: '10:30', status: 'confirmed' },
];

export const availableTimes = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
];
