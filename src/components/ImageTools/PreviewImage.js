//效果展示组件

import React, { useEffect, useState,useRef } from 'react';
import { Modal,Empty } from 'antd';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

const PreviewImage = ({ qrcodeUrl, imageUrl,onChangePreviewnotice }) => {
    const [previewImgUrl, setPreviewImgUrl] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false);
    const canvasDom = useRef( document.createElement('canvas'))
    useEffect(() => {
        if (qrcodeUrl) {
            let data = previewCanvasChange(qrcodeUrl, imageUrl)
            data.then((res) => {
                setPreviewImgUrl(res)
                onChangePreviewnotice(res)
            })

        }
    }, [qrcodeUrl, imageUrl])

    const handelPreview = () => {
        setIsModalOpen(true)
    }
    const handleOk = () => {
        setIsModalOpen(false);
    };

    const handleCancel = () => {
        setIsModalOpen(false);
    };

    //设置一个canvas并叠加二维码最终得到图片信息
    const previewCanvasChange = async (qrcodeUrl, imageUrl) => {
        let codeItemData = await QRCode.toDataURL(qrcodeUrl, {
            margin: 0,
            scale: 3,
            // color:{   //修改二维码的颜色
            //     dark:"#ff0000"
            // }
        })
        return new Promise((resolve, reject) => {
            let canvas = canvasDom.current;
            let ctx = canvas.getContext("2d");
            // 用于存储覆盖图片的元素
            const overlayImage = new Image();
            overlayImage.src = codeItemData; // 替换为你的覆盖图片路径
            const img = new Image();
            img.src = imageUrl;
            img.onload = function () {
                canvas.width = img.width;
                canvas.height = img.height;
                if (ctx) {
                    ctx.drawImage(img, 0, 0, img.width, img.height);
                    // 使用jsQR检测二维码的位置
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const { data } = imageData;
                    const code = jsQR(data, canvas.width, canvas.height);
                    if (code) {
                        const ints = code.location;
                        // 覆盖图片的位置
                        const overlayX = ints.topLeftCorner.x;
                        const overlayY = ints.topLeftCorner.y;
                        // 在二维码位置上覆盖另一张图片
                        ctx.drawImage(overlayImage, overlayX, overlayY, ints.topRightCorner.x - overlayX + 2, ints.bottomLeftCorner.y - overlayY + 2);
                        const ctxData = canvas.toDataURL();
                        resolve(ctxData)
                    }
                }
            }
        })
    }

    return (
        <div>
            {previewImgUrl ? <img src={previewImgUrl} style={{ maxWidth: "200px", cursor: 'pointer' }} title='点击查看大图' onClick={handelPreview} />
            :<Empty description="正在解析,请稍等"  />}
            <Modal width={600} open={isModalOpen} title="预览图片" onOk={handleOk} onCancel={handleCancel} className='image-modal'>
                <img src={previewImgUrl} style={{ width: "100%" }} />
            </Modal>
        </div>
    );
};



export default PreviewImage;
