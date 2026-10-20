import { config } from 'dotenv';

config();

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export interface SeedDataset {
  transactionsCount: number;
  totalVolume: string;
  activeUsers: number;
}

/**
 * Seeds test data into the backend or local store for E2E test runs (#448)
 */
export async function seedTestData(): Promise<SeedDataset> {
  const mockDataset: SeedDataset = {
    transactionsCount: 1540,
    totalVolume: '450000.00',
    activeUsers: 320,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/test/seed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Seeder-Key': process.env.TEST_SEEDER_SECRET || 'dev-secret-key',
      },
      body: JSON.stringify(mockDataset),
    });

    if (!response.ok) {
      console.warn('API seed endpoint returned non-OK status. Falling back to local mock state.');
    } else {
      console.log('Successfully seeded CI test data via API.');
    }
  } catch (error) {
    console.error('Failed to connect to seed endpoint. Running with local mock fixtures.', error);
  }

  return mockDataset;
}

// Allow running directly via ts-node or node
if (require.main === module) {
  seedTestData()
    .then((data) => {
      console.log('Seed completed:', data);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}