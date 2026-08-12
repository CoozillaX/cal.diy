"use client";

import getBrandColours from "@calcom/lib/getBrandColours";
import useTheme from "@calcom/lib/hooks/useTheme";
import useMeQuery from "@calcom/trpc/react/hooks/useMeQuery";
import { useCalcomTheme } from "@calcom/ui/styles";

export const useAppTheme = () => {
  "use no memo";
  const { data: user } = useMeQuery();
  const brandTheme = getBrandColours({
    lightVal: user?.brandColor,
    darkVal: user?.darkBrandColor,
  });
  useCalcomTheme(brandTheme);
  useTheme(user?.appTheme);
};
