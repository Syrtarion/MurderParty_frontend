import { jest } from "@jest/globals";

export const useRouter = () => ({
  replace: jest.fn(),
  push: jest.fn(),
  refresh: jest.fn(),
});

export const useParams = () => ({
  playerId: null,
});

export const useSearchParams = () => new URLSearchParams();
