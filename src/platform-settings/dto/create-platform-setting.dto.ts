export class CreatePlatformSettingDto {
  key: string;
  value: string;
  value_type?: string;
  description?: string;
  category?: string;
  is_active?: boolean;
}
