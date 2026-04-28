# Vencord (DEV Build)
## Windows
### 1. Yêu cầu

- Phiên bản bạn đang sử dụng là **Vencord DEV Build**. Nếu bạn không biết cách cài đặt, bạn có thể [nhấp vào đây](https://docs.vencord.dev/installing/) để đọc hướng dẫn cài đặt, nhưng hãy xem xét sử dụng `https://github.com/gujarathisampath/VeeeCord.git` thay vì `https://github.com/Vendicated/Vencord.git` khi bạn nhân bản, vì VeeeCord đã sửa đổi phiên bản VỚI CSP cho fakeProfile.

### 2. Cài đặt Plugin

Mở **Windows Explorer** và chọn đường dẫn nơi bạn đã cài đặt **Vencord** và nhấp vào thư mục `src`. Trong thư mục bạn vừa nhấp, tạo một thư mục mới tên là `userplugins` _(nếu bạn đã có thư mục đó, bạn có thể bỏ qua bước tạo thư mục `userplugins`)_.

- Trong thư mục `userplugins`, nhấp vào thanh địa chỉ và gõ **cmd** và nhấn **enter**.

Trong **Command Prompt** sử dụng lệnh này:

```shell
git clone https://github.com/gujarathisampath/fakeProfile.git
```

Sau khi gõ dòng lệnh, chờ đến khi tải xuống hoàn tất và sau đó gõ:

```shell
pnpm build
```

- Inject Vencord vào Discord (Nếu bạn sử dụng Vesktop hoặc extension build thì có thể bỏ qua bước này):

```shell
pnpm inject
```

Và đó là tất cả. Bây giờ bạn có thể khởi động lại Discord và kiểm tra **fakeProfile** trong cài đặt **Plugins**.

### 3. Cách cập nhật plugin fakeProfile?

- Đi đến `Vencord\src\userplugins\fakeProfile` trong thanh địa chỉ gõ **cmd** và nhấp vào **Command Prompt** gõ:

```shell
git pull
```

- Sau đó gõ:

```shell
pnpm build
```

Đó là tất cả. Khởi động lại client Discord của bạn và tận hưởng.

## Linux

### Sử dụng lệnh
- Bạn có thể cài đặt fakeProfile và Vencord DEV Build ở dòng lệnh dưới đây:
```shell
curl -o- 'https://raw.githubusercontent.com/ExtbhiteEAS/fakeProfile/refs/heads/main/assets/fpInstaller.sh' | bash
```

### Cách thủ công
> [!CAUTION]
> Bạn cần cài đặt các thư viện như `git nodejs npm` để làm việc này.

- Bạn có thể cài đặt fakeProfile và Vencord DEV Build thông qua lệnh thủ công:
```shell
git clone https://github.com/gujarathisampath/VeeeCord.git
cd VeeeCord/ && sudo npm i -g pnpm && pnpm i
cd src/ && mkdir userplugins
cd userplugins/ && git clone https://github.com/gujarathisampath/fakeProfile.git && pnpm build
sudo pnpm inject
```

- Sau các lệnh thủ công đó thì bạn đã cài đặt thành công Vencord DEV Build với fakeProfile tuy nhiên để khởi động thủ công thì bạn cần nhập lệnh `pnpm start`.

## Extension (Tiện ích mở rộng)
- Tham gia [Discord](https://discord.gg/ffmkewQ4R7) của chúng tôi và tìm kênh `#install-and-info` để lấy extension cho trình duyệt của bạn.

## Bunny (Pyoncord)

> [!NOTE]
> Vào ngày 29/04/2025, Bunny đã dừng hỗ trợ và không hoạt động. URL plugin dành cho Bunny hiện tại đã bị hỏng. Bây giờ việc cài đặt dành cho Android có thể tìm thấy ở trong server Discord, sẽ có một số thông tin cần thiết để giúp bạn cài đặt. **Sử dụng bất kỳ bản fork nào của client Vendetta**

## Emnity

> [!NOTE]
> Chúng tôi không biết gì về cái này. Nếu bạn biết, hãy làm issue về vấn đề này.
> Hoặc sử dụng các client giống như Revange hoặc Vetta có hỗ trợ cho iOS.