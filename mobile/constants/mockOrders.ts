export interface DeliveryOrder {
  id: string;
  orderNumber: string;
  cargo: string;
  quantityLiters: number;
  pickupLocation: string;
  dropLocation: string;
  scheduledDate: string;
  status: 'pending' | 'active' | 'completed';
}

const ORDERS_BY_VEHICLE: Record<string, DeliveryOrder[]> = {
  'TRK-001': [
    { id: 'DO-001-A', orderNumber: 'DO-2026-0101', cargo: 'HSD Diesel',         quantityLiters: 28000, pickupLocation: 'Karachi Port Terminal',         dropLocation: 'Hyderabad Bypass Depot',         scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-001-B', orderNumber: 'DO-2026-0102', cargo: 'Petrol RON-92',       quantityLiters: 25000, pickupLocation: 'Karachi Kemari Terminal',        dropLocation: 'Hyderabad City Depot',           scheduledDate: '18/06/2026', status: 'pending'   },
    { id: 'DO-001-C', orderNumber: 'DO-2026-0103', cargo: 'Engine Oil (Bulk)',   quantityLiters: 15000, pickupLocation: 'Karachi Industrial Zone',         dropLocation: 'Jamshoro Industrial Depot',      scheduledDate: '19/06/2026', status: 'pending'   },
  ],
  'TRK-002': [
    { id: 'DO-002-A', orderNumber: 'DO-2026-0201', cargo: 'Petrol RON-92',       quantityLiters: 24000, pickupLocation: 'Lahore Petroleum Depot',         dropLocation: 'Gujranwala Fuel Station',         scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-002-B', orderNumber: 'DO-2026-0202', cargo: 'HSD Diesel',          quantityLiters: 26000, pickupLocation: 'Lahore Ring Road Terminal',      dropLocation: 'Sialkot Industrial Zone',         scheduledDate: '19/06/2026', status: 'pending'   },
  ],
  'TRK-003': [
    { id: 'DO-003-A', orderNumber: 'DO-2026-0301', cargo: 'HSD Diesel',          quantityLiters: 30000, pickupLocation: 'Multan Petroleum Terminal',      dropLocation: 'Khanewal Distribution Hub',       scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-003-B', orderNumber: 'DO-2026-0302', cargo: 'Aviation Fuel JET-A1',quantityLiters: 20000, pickupLocation: 'Multan Airport Supply Depot',    dropLocation: 'Bahawalpur Airport',              scheduledDate: '20/06/2026', status: 'pending'   },
  ],
  'TRK-004': [
    { id: 'DO-004-A', orderNumber: 'DO-2026-0401', cargo: 'Petrol RON-95',       quantityLiters: 31000, pickupLocation: 'Rawalpindi Petroleum Hub',       dropLocation: 'Attock Refinery Depot',          scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-004-B', orderNumber: 'DO-2026-0402', cargo: 'Kerosene',            quantityLiters: 22000, pickupLocation: 'Islamabad Supply Depot',         dropLocation: 'Peshawar Distribution Center',   scheduledDate: '20/06/2026', status: 'pending'   },
  ],
  'TRK-005': [
    { id: 'DO-005-A', orderNumber: 'DO-2026-0501', cargo: 'HSD Diesel',          quantityLiters: 29000, pickupLocation: 'Karachi Superhighway Depot',     dropLocation: 'Nooriabad Industrial Zone',       scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-005-B', orderNumber: 'DO-2026-0502', cargo: 'Petrol RON-92',       quantityLiters: 27000, pickupLocation: 'Karachi East Terminal',          dropLocation: 'Jamshoro Power Station',          scheduledDate: '18/06/2026', status: 'pending'   },
  ],
  'TRK-006': [
    { id: 'DO-006-A', orderNumber: 'DO-2026-0601', cargo: 'HSD Diesel',          quantityLiters: 27000, pickupLocation: 'Lahore Thokar Terminal',         dropLocation: 'Sahiwal Coal Power Plant',        scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-006-B', orderNumber: 'DO-2026-0602', cargo: 'Petrol RON-92',       quantityLiters: 23000, pickupLocation: 'Lahore South Depot',             dropLocation: 'Okara Fuel Station',              scheduledDate: '19/06/2026', status: 'pending'   },
  ],
  'TRK-007': [
    { id: 'DO-007-A', orderNumber: 'DO-2026-0701', cargo: 'HSD Diesel',          quantityLiters: 25000, pickupLocation: 'Sukkur Barrage Depot',           dropLocation: 'Shikarpur Distribution Hub',      scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-007-B', orderNumber: 'DO-2026-0702', cargo: 'Petrol RON-92',       quantityLiters: 20000, pickupLocation: 'Sukkur Industrial Area',         dropLocation: 'Larkana Fuel Station',            scheduledDate: '18/06/2026', status: 'pending'   },
  ],
  'TRK-008': [
    { id: 'DO-008-A', orderNumber: 'DO-2026-0801', cargo: 'HSD Diesel',          quantityLiters: 23000, pickupLocation: 'Peshawar GT Road Terminal',      dropLocation: 'Nowshera Interchange Depot',      scheduledDate: '17/06/2026', status: 'active'    },
    { id: 'DO-008-B', orderNumber: 'DO-2026-0802', cargo: 'Petrol RON-92',       quantityLiters: 18000, pickupLocation: 'Peshawar Hayatabad Depot',       dropLocation: 'Mardan Distribution Center',      scheduledDate: '20/06/2026', status: 'pending'   },
  ],
};

export function getOrdersForVehicle(vehicleId: string): DeliveryOrder[] {
  return ORDERS_BY_VEHICLE[vehicleId] ?? [];
}
